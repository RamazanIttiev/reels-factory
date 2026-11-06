import { parseArgs } from "node:util";
import { ageDays, loadFactSheet, normalizeText } from "./facts";
import type { Claim } from "./facts";
import { listLangs, loadLang, loadVisual } from "./load-episode";
import { loadFactRules, loadSources, tierOf } from "./sources";
import { findTopic, loadTopics } from "./topics";

export type Verdict = { errors: string[]; warnings: string[]; skipped?: string };

const ATTRIBUTION = /по данным|по версии|по словам|по информации|в отч[её]те|в своём разборе|в своем разборе|сообщил|сообщила|заявил|заявила|according to|reportedly/i;
const ABSOLUTES = /\b(всегда|никогда|любой|любая|любое|любые|лучший|лучшая|лучшее|все без исключения)\b|\b(always|never|every|best|worst|guaranteed)\b/i;

const numbersIn = (text: string): string[] =>
  (
    text
      .replace(/(\d)[,\s](\d{3})(?!\d)/g, "$1$2")
      .match(/\d+(?:[.,]\d+)?/g) ?? []
  ).map((token) => token.replace(",", "."));

const isNameLike = (token: string): boolean => /^[A-Z]/.test(token) && token.length > 1;

const isSentenceStart = (text: string, index: number): boolean => index === 0 || /[.!?]\s+$/.test(text.slice(0, index));

const hasInnerCapsOrDigits = (token: string): boolean => /[A-Z0-9]/.test(token.slice(1));

const latinNamesIn = (text: string): string[] =>
  [...text.matchAll(/[A-Za-z][A-Za-z0-9.+-]*/g)]
    .filter((match) => isNameLike(match[0].replace(/[.+-]+$/, "")))
    .filter((match) => !isSentenceStart(text, match.index ?? 0) || hasInnerCapsOrDigits(match[0]))
    .map((match) => match[0].replace(/[.+-]+$/, ""));

const cyrillicNamesIn = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => sentence.split(/\s+/).slice(1))
    .map((word) => word.replace(/[.,!?;:«»"()]+/g, ""))
    .filter((word) => /^[А-ЯЁ][а-яё]+/.test(word) && word.length > 2);

const quoteNumbers = (claims: Claim[]): Set<string> => new Set(claims.flatMap((claim) => numbersIn(claim.quote)));

const quoteText = (claims: Claim[]): string => normalizeText(claims.map((claim) => claim.quote).join(" ")).toLowerCase();

const checkPiece = (label: string, texts: string[], claims: Claim[]): Verdict => {
  const text = texts.join(" ");
  const knownNumbers = quoteNumbers(claims);
  const haystack = quoteText(claims);
  return {
    errors: [
      ...numbersIn(text)
        .filter((number) => !knownNumbers.has(number))
        .map((number) => `${label}: number "${number}" is not in the quotes of its claims`),
      ...texts.flatMap(latinNamesIn)
        .filter((name) => !haystack.includes(name.toLowerCase()))
        .map((name) => `${label}: name "${name}" is not in the quotes of its claims`),
    ],
    warnings: [
      ...texts.flatMap(cyrillicNamesIn)
        .filter((name) => !haystack.includes(name.toLowerCase().slice(0, Math.max(4, name.length - 2))))
        .map((name) => `${label}: capitalized word "${name}" is not in the quotes (check by hand if it is a name)`),
      ...(ABSOLUTES.test(text) ? [`${label}: absolute wording, hedge it unless a claim supports it`] : []),
    ],
  };
};

export const verifyEpisode = (slug: string, lang: string): Verdict => {
  const topic = findTopic(loadTopics(), slug);
  if (!topic) return { errors: [`no topic with slug ${slug} in plan/topics.json`], warnings: [] };
  if (topic.legacy) return { errors: [], warnings: [], skipped: "legacy topic, written before the fact gate" };

  const sheet = loadFactSheet(slug);
  if (!sheet) return { errors: [`facts/${slug}.json is missing: run facts first`], warnings: [] };
  const rules = loadFactRules();
  const sources = loadSources();
  const byId = new Map(sheet.claims.map((claim) => [claim.id, claim]));
  const language = loadLang(slug, lang);

  const sheetErrors = sheet.claims.flatMap((claim) => [
    ...(tierOf(claim.url, sources) === undefined ? [`claim ${claim.id}: ${claim.url} is not on an allowed domain`] : []),
    ...(claim.tier > rules.min_source_tier ? [`claim ${claim.id}: tier ${claim.tier} is below required ${rules.min_source_tier}`] : []),
    ...(claim.source_date || claim.version ? [] : [`claim ${claim.id}: no source date or version`]),
  ]);

  const pieces = [
    { label: "hook", texts: [language.hook.text], ids: language.hook.claims },
    ...Object.entries(language.scenes).map(([id, scene]) => ({
      label: `scene ${id}`,
      texts: [scene.narration, ...Object.values(scene.labels ?? {})],
      ids: scene.claims,
    })),
  ];

  const results = pieces.map(({ label, texts, ids }): Verdict => {
    if (ids.length === 0) return { errors: [`${label}: no claims`], warnings: [] };
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) return { errors: [`${label}: unknown claims ${missing.join(", ")}`], warnings: [] };
    return checkPiece(label, texts, ids.flatMap((id) => byId.get(id) ?? []));
  });

  const codeErrors = loadVisual(slug, lang).scenes.flatMap((scene) => {
    if (scene.type !== "code") return [];
    const caption = language.scenes[scene.id]?.labels?.caption ?? "";
    if (scene.provenance === "schematic") {
      return /схем|schematic|simplified/i.test(caption) ? [] : [`scene ${scene.id}: schematic code needs "схема" (ru) or "schematic" (en) in labels.caption so the screen says it is simplified`];
    }
    if (scene.provenance !== "quoted") return [`scene ${scene.id}: code scene needs provenance "quoted" or "schematic"`];
    const claims = (language.scenes[scene.id]?.claims ?? []).flatMap((id) => byId.get(id) ?? []);
    const known = quoteNumbers(claims);
    return numbersIn(scene.code).filter((n) => !known.has(n)).map((n) => `scene ${scene.id}: number "${n}" in quoted code is not in the claim quotes`);
  });

  const spoken = [language.hook.text, ...Object.values(language.scenes).map((scene) => scene.narration)].join(" ");
  const attribution =
    topic.kind === "incident" && !ATTRIBUTION.test(spoken)
      ? ["incident topic: add attribution to the operator's report (например «по данным отчёта компании»)"]
      : [];
  const stale = ageDays(sheet.created) >= rules.recheck_after_days ? [`facts/${slug}.json is older than ${rules.recheck_after_days} days: recheck`] : [];
  const used = new Set(pieces.flatMap((piece) => piece.ids));
  const unused = sheet.claims.filter((claim) => !used.has(claim.id)).map((claim) => `claim ${claim.id} is not used by any scene`);

  return {
    errors: [...sheetErrors, ...codeErrors, ...results.flatMap((r) => r.errors), ...attribution],
    warnings: [...stale, ...unused, ...results.flatMap((r) => r.warnings)],
  };
};

const isMain = process.argv[1]?.endsWith("verify.ts") ?? false;

if (isMain) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" } } });
  const slug = positionals[0];
  if (!slug) {
    console.error("Usage: verify <slug> --lang ru");
    process.exit(1);
  }
  const langs = values.lang ? [values.lang] : listLangs(slug);
  const failed = langs.map((lang) => {
    const verdict = verifyEpisode(slug, lang);
    if (verdict.skipped) console.log(`skip ${lang}: ${verdict.skipped}`);
    verdict.warnings.forEach((line) => console.warn(`WARN ${lang}: ${line}`));
    verdict.errors.forEach((line) => console.error(`FAIL ${lang}: ${line}`));
    if (!verdict.skipped && verdict.errors.length === 0) console.log(`ok   ${lang}: all scenes and hook are backed by claims`);
    return verdict.errors.length > 0;
  });
  process.exit(failed.some(Boolean) ? 1 : 0);
}
