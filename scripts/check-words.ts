import { narrations, spokenWordCount } from "../src/episode";
import { listLangs, loadEpisode } from "./load-episode";

export const MIN_WORDS = 70;
export const MAX_WORDS = 110;

export const wordCount = (slug: string, lang: string): number =>
  narrations(loadEpisode(slug, lang)).reduce((sum, { text }) => sum + spokenWordCount(text), 0);

export const wordWarning = (lang: string, count: number): string | undefined =>
  count < MIN_WORDS || count > MAX_WORDS
    ? `WARN ${lang}: ${count} words, budget is ${MIN_WORDS}-${MAX_WORDS}`
    : undefined;

const isMain = process.argv[1]?.endsWith("check-words.ts") ?? false;

if (isMain) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: check-words <episode>");
    process.exit(1);
  }
  listLangs(slug).forEach((lang) => {
    const count = wordCount(slug, lang);
    console.log(wordWarning(lang, count) ?? `ok   ${lang}: ${count} words (~${Math.round(count / 2.5)}s)`);
  });
}
