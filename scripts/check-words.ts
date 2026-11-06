import { narrations, spokenWordCount } from "../src/episode";
import { existsSync, readFileSync } from "node:fs";
import { listLangs, loadEpisode } from "./load-episode";
import { isRecord } from "./state";

type Pace = { min: number; max: number; secondsPerWord: number };

const PACE: Record<string, Pace> = {
  ru: { min: 108, max: 125, secondsPerWord: 0.47 },
  en: { min: 135, max: 160, secondsPerWord: 0.38 },
};

export const paceOf = (lang: string): Pace => PACE[lang] ?? PACE.ru;

export const MIN_WORDS = PACE.ru.min;
export const MAX_WORDS = PACE.ru.max;
export const SECONDS_PER_WORD = PACE.ru.secondsPerWord;

const lengthLimits = (): [number, number] => {
  const raw: unknown = JSON.parse(readFileSync("config/rules.json", "utf8"));
  const content = isRecord(raw) ? raw.content : undefined;
  const range = isRecord(content) ? content.length_seconds : undefined;
  return Array.isArray(range) && typeof range[0] === "number" && typeof range[1] === "number" ? [range[0], range[1]] : [50, 60];
};

export const estimatedSeconds = (count: number, lang = "ru"): number =>
  Math.round(count * paceOf(lang).secondsPerWord * 10) / 10;

export const wordCount = (slug: string, lang: string): number =>
  narrations(loadEpisode(slug, lang)).reduce((sum, { text }) => sum + spokenWordCount(text), 0);

export const wordWarning = (lang: string, count: number): string | undefined =>
  count < paceOf(lang).min || count > paceOf(lang).max
    ? `WARN ${lang}: ${count} words, budget is ${paceOf(lang).min}-${paceOf(lang).max}`
    : estimatedSeconds(count, lang) > lengthLimits()[1]
      ? `WARN ${lang}: ${count} words is about ${estimatedSeconds(count, lang)}s, limit is ${lengthLimits()[1]}s (max ${Math.floor(lengthLimits()[1] / paceOf(lang).secondsPerWord)} words)`
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
  const langAt = process.argv.indexOf("--lang");
  const only = langAt >= 0 ? process.argv[langAt + 1] : undefined;
  listLangs(slug).filter((lang) => !only || lang === only).forEach((lang) => {
    const count = wordCount(slug, lang);
    console.log(wordWarning(lang, count) ?? `ok   ${lang}: ${count} words (~${estimatedSeconds(count, lang)}s)`);
  });
}
