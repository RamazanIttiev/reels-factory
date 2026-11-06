import { seriesFor } from "../src/series";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadEpisode } from "./load-episode";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" } } });

const slug = positionals[0];
if (!slug) {
  console.error("Usage: cover <episode> --lang ru");
  process.exit(1);
}

const lang = values.lang ?? "ru";
const episode = loadEpisode(slug, lang);

mkdirSync(".cache/props", { recursive: true });
mkdirSync("covers", { recursive: true });
const propsPath = `.cache/props/${slug}.${lang}.cover.json`;
const output = `covers/${slug}.${lang}.jpg`;
writeFileSync(propsPath, JSON.stringify({ hook: episode.hook, handle: seriesFor(lang).handle, avatar: seriesFor(lang).avatar }));

const result = spawnSync(
  "npx",
  ["remotion", "still", "src/index.ts", "Cover", output, `--props=${propsPath}`, "--image-format=jpeg", "--jpeg-quality=92", "--log=error"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(output);
