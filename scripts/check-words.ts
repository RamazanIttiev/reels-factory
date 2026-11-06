import { narrations, spokenWordCount } from "../src/episode";
import { existsSync, readFileSync } from "node:fs";
import { listLangs, loadEpisode } from "./load-episode";
import { isRecord } from "./state";

export const MIN_WORDS = 108;
export const MAX_WORDS = 125;

export const SECONDS_PER_WORD = 0.47;

const lengthLimits = (): [number, number] => {
  const raw: unknown = JSON.parse(readFileSync("config/rules.json", "utf8"));
  const content = isRecord(raw) ? raw.content : undefined;
  const range = isRecord(content) ? content.length_seconds : undefined;
  return Array.isArray(range) && typeof range[0] === "number" && typeof range[1] === "number" ? [range[0], range[1]] : [50, 60];
};

export const estimatedSeconds = (count: number): number => Math.round(count * SECONDS_PER_WORD * 10) / 10;

export const wordCount = (slug: string, lang: string): number =>
  narrations(loadEpisode(slug, lang)).reduce((sum, { text }) => sum + spokenWordCount(text), 0);

export const wordWarning = (lang: string, count: number): string | undefined =>
  count < MIN_WORDS || count > MAX_WORDS
    ? `WARN ${lang}: ${count} words, budget is ${MIN_WORDS}-${MAX_WORDS}`
    : estimatedSeconds(count) > lengthLimits()[1]
      ? `WARN ${lang}: ${count} words is about ${estimatedSeconds(count)}s, limit is ${lengthLimits()[1]}s (max ${Math.floor(lengthLimits()[1] / SECONDS_PER_WORD)} words)`
      : undefined;

const isMain = process.argv[1]?.endsWith("check-words.ts") ?? false;

if (isMain) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: check-words <episode>");
    process.exit(1);
  }
  if (!existsSync(`episodes/${slug}`)) {
    console.error(`No episode folder episodes/${slug}`);
    process.exit(1);
  }
  listLangs(slug).forEach((lang) => {
    const count = wordCount(slug, lang);
    console.log(wordWarning(lang, count) ?? `ok   ${lang}: ${count} words (~${estimatedSeconds(count)}s)`);
  });
}
