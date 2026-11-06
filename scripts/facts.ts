import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadFactRules, loadSources, tierOf } from "./sources";
import { isRecord } from "./state";
import { findTopic, loadTopics, saveTopics } from "./topics";

export type Claim = {
  id: string;
  text: string;
  url: string;
  tier: number;
  quote: string;
  accessed: string;
  source_date: string | null;
  version: string | null;
};

export type FactSheet = { slug: string; topic_id: number; created: string; claims: Claim[] };

const CACHE_DIR = ".cache/sources";
const LOG_PATH = "facts/fetch.log.jsonl";
const MIN_QUOTE_CHARS = 15;
const MAX_QUOTE_CHARS = 600;
const DAY_MS = 86_400_000;

export const factsPath = (slug: string): string => `facts/${slug}.json`;

const isClaim = (value: unknown): value is Claim =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.text === "string" &&
  typeof value.url === "string" &&
  typeof value.tier === "number" &&
  typeof value.quote === "string" &&
  typeof value.accessed === "string";

export const loadFactSheet = (slug: string): FactSheet | undefined => {
  if (!existsSync(factsPath(slug))) return undefined;
  const parsed: unknown = JSON.parse(readFileSync(factsPath(slug), "utf8"));
  if (!isRecord(parsed) || !Array.isArray(parsed.claims) || !parsed.claims.every(isClaim)) {
    throw new Error(`Invalid ${factsPath(slug)}`);
  }
  return {
    slug: String(parsed.slug),
    topic_id: Number(parsed.topic_id),
    created: String(parsed.created),
    claims: parsed.claims,
  };
};

export const factSheetHash = (slug: string): string | undefined =>
  existsSync(factsPath(slug)) ? createHash("sha256").update(readFileSync(factsPath(slug))).digest("hex") : undefined;

export const ageDays = (iso: string, now = new Date()): number => (now.getTime() - new Date(iso).getTime()) / DAY_MS;

export const normalizeText = (text: string): string =>
  text
    .replace(/[   ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const decodeEntities = (text: string): string =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));

const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

type Fetched = { text: string; sourceDate: string | null; fromCache: boolean };

const log = (entry: Record<string, unknown>): void => {
  mkdirSync("facts", { recursive: true });
  appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

const metaDate = (html: string, header: string | null): string | null => {
  const patterns = [
    /property=["']article:(?:published|modified)_time["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']article:(?:published|modified)_time["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<meta\s+name=["'](?:date|dcterms\.date)["']\s+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find((value) => value !== undefined) ?? header;
};

const cachePaths = (url: string): { text: string; meta: string } => {
  const key = createHash("sha256").update(url).digest("hex");
  return { text: `${CACHE_DIR}/${key}.txt`, meta: `${CACHE_DIR}/${key}.json` };
};

const fetchSource = async (url: string, recheckDays: number, refresh: boolean): Promise<Fetched> => {
  const tier = tierOf(url, loadSources());
  if (tier === undefined) {
    log({ url, allowed: false, note: "domain not in config/sources.json" });
    throw new Error(`Blocked: ${url} is not on an allowed domain (config/sources.json)`);
  }
  const paths = cachePaths(url);
  if (!refresh && existsSync(paths.text) && existsSync(paths.meta)) {
    const meta: unknown = JSON.parse(readFileSync(paths.meta, "utf8"));
    if (isRecord(meta) && typeof meta.fetchedAt === "string" && ageDays(meta.fetchedAt) < recheckDays) {
      log({ url, allowed: true, tier, cached: true });
      return {
        text: readFileSync(paths.text, "utf8"),
        sourceDate: typeof meta.sourceDate === "string" ? meta.sourceDate : null,
        fromCache: true,
      };
    }
  }
  const response = await fetch(url, { headers: { "User-Agent": "reels-factory-facts/1.0" } });
  if (tierOf(response.url, loadSources()) === undefined) {
    log({ url, finalUrl: response.url, allowed: false, note: "redirected off the allowlist" });
    throw new Error(`Blocked: ${url} redirected to ${response.url}, which is not on an allowed domain`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || contentType.includes("pdf")) {
    log({ url, allowed: true, tier, status: response.status, contentType, note: "unusable response" });
    throw new Error(`Cannot use ${url}: HTTP ${response.status} ${contentType}`);
  }
  const body = await response.text();
  const text = contentType.includes("html") ? htmlToText(body) : body;
  const sourceDate = metaDate(body, response.headers.get("last-modified"));
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(paths.text, text);
  writeFileSync(paths.meta, JSON.stringify({ url, fetchedAt: new Date().toISOString(), sourceDate }));
  log({ url, allowed: true, tier, status: response.status, bytes: body.length, cached: false });
  return { text, sourceDate, fromCache: false };
};

export type NewClaim = { claim: string; url: string; quote: string; source_date?: string; version?: string };

const isNewClaim = (value: unknown): value is NewClaim =>
  isRecord(value) && typeof value.claim === "string" && typeof value.url === "string" && typeof value.quote === "string";

const addClaim = async (sheet: FactSheet, input: NewClaim, recheckDays: number, minTier: number): Promise<FactSheet> => {
  const tier = tierOf(input.url, loadSources());
  if (tier === undefined) throw new Error(`Blocked: ${input.url} is not on an allowed domain`);
  if (tier > minTier) throw new Error(`${input.url} is tier ${tier}, rules.json requires tier ${minTier}: lead only, not saved`);
  const quote = normalizeText(input.quote);
  if (quote.length < MIN_QUOTE_CHARS || quote.length > MAX_QUOTE_CHARS) {
    throw new Error(`Quote must be ${MIN_QUOTE_CHARS}-${MAX_QUOTE_CHARS} chars: "${quote.slice(0, 40)}"`);
  }
  const fetched = await fetchSource(input.url, recheckDays, false);
  if (!normalizeText(fetched.text).includes(quote)) {
    throw new Error(`Quote not found verbatim at ${input.url}: "${quote.slice(0, 60)}"`);
  }
  const sourceDate = input.source_date ?? fetched.sourceDate;
  if (!sourceDate && !input.version) {
    throw new Error(`No source date or version found for ${input.url}: pass source_date or version`);
  }
  const claim: Claim = {
    id: `c${sheet.claims.length + 1}`,
    text: input.claim,
    url: input.url,
    tier,
    quote,
    accessed: new Date().toISOString().slice(0, 10),
    source_date: sourceDate ?? null,
    version: input.version ?? null,
  };
  return { ...sheet, claims: [...sheet.claims, claim] };
};

const isMain = process.argv[1]?.endsWith("facts.ts") ?? false;

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string", multiple: true },
      "add-file": { type: "string" },
      claim: { type: "string" },
      quote: { type: "string" },
      "source-date": { type: "string" },
      version: { type: "string" },
      refresh: { type: "boolean" },
    },
  });
  const slug = positionals[0];
  if (!slug) {
    console.error("Usage: facts <slug> [--url U ...] [--add-file claims.json | --claim T --url U --quote Q [--source-date D] [--version V]]");
    process.exit(1);
  }
  const file = loadTopics();
  const topic = findTopic(file, slug);
  if (!topic) {
    console.error(`No topic with slug ${slug}`);
    process.exit(1);
  }
  const rules = loadFactRules();
  const existing = loadFactSheet(slug);
  const sheet: FactSheet = existing ?? { slug, topic_id: topic.id, created: new Date().toISOString().slice(0, 10), claims: [] };
  const urls = values.url ?? [];

  const incoming: NewClaim[] = values["add-file"]
    ? (() => {
        const parsed: unknown = JSON.parse(readFileSync(values["add-file"], "utf8"));
        if (!Array.isArray(parsed) || !parsed.every(isNewClaim)) throw new Error("--add-file must be an array of {claim,url,quote}");
        return parsed;
      })()
    : values.claim && values.quote && urls[0]
      ? [{ claim: values.claim, url: urls[0], quote: values.quote, source_date: values["source-date"], version: values.version }]
      : [];

  if (incoming.length === 0 && urls.length === 0) {
    const fresh = existing !== undefined && ageDays(existing.created) < rules.recheck_after_days;
    console.log(
      existing
        ? `${factsPath(slug)}: ${existing.claims.length} claims, created ${existing.created}${fresh ? ", fresh, not re-reading" : ", STALE: recheck sources"}`
        : `${factsPath(slug)} does not exist. Topic sources to locate (titles, not URLs): ${topic.sources.join(" | ") || "none"}\nRead a source: facts ${slug} --url <https allowed-domain url>\nSave a claim: facts ${slug} --claim "text" --url U --quote "exact passage" [--source-date D]`,
    );
    return;
  }

  const sheetIsFresh = existing !== undefined && ageDays(existing.created) < rules.recheck_after_days;
  if (incoming.length === 0 && sheetIsFresh) {
    console.log(`${factsPath(slug)} is fresh (recheck after ${rules.recheck_after_days} days): sources not re-read`);
    return;
  }

  for (const url of urls) {
    const fetched = await fetchSource(url, rules.recheck_after_days, values.refresh ?? false);
    console.log(`${url}: ${fetched.text.length} chars${fetched.fromCache ? " (cache)" : ""}, source date: ${fetched.sourceDate ?? "unknown"}`);
  }

  const updated = await incoming.reduce<Promise<FactSheet>>(
    async (previous, input) => addClaim(await previous, input, rules.recheck_after_days, rules.min_source_tier),
    Promise.resolve(sheet),
  );
  if (incoming.length > 0) {
    mkdirSync("facts", { recursive: true });
    writeFileSync(factsPath(slug), `${JSON.stringify(updated, null, 2)}\n`);
    if (topic.fact_sheet !== factsPath(slug)) {
      saveTopics({ ...file, topics: file.topics.map((t) => (t.slug === slug ? { ...t, fact_sheet: factsPath(slug) } : t)) });
    }
    console.log(`${factsPath(slug)}: saved ${updated.claims.length - sheet.claims.length} claims, total ${updated.claims.length}`);
  }
};

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
