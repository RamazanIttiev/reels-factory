import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolveEpisode } from "../src/episode";
import type { Episode } from "../src/episode";
import { isLang, isVisual } from "../src/types";
import type { Lang, Visual } from "../src/types";

const episodeDir = (slug: string): string => `episodes/${slug}`;

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const loadVisual = (slug: string, lang: string): Visual => {
  const path = `${episodeDir(slug)}/visual.${lang}.json`;
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  const parsed = readJson(path);
  if (!isVisual(parsed)) throw new Error(`Invalid ${path}`);
  return parsed;
};

export const loadLang = (slug: string, lang: string): Lang => {
  const path = `${episodeDir(slug)}/${lang}.json`;
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  const parsed = readJson(path);
  if (!isLang(parsed)) throw new Error(`Invalid ${path}`);
  return parsed;
};

export const loadEpisode = (slug: string, lang: string): Episode =>
  resolveEpisode(loadVisual(slug, lang), loadLang(slug, lang));

export const listLangs = (slug: string): string[] =>
  readdirSync(episodeDir(slug))
    .filter((file) => /^[a-z]{2}\.json$/.test(file))
    .map((file) => file.replace(".json", ""))
    .filter((lang) => existsSync(`${episodeDir(slug)}/visual.${lang}.json`));
