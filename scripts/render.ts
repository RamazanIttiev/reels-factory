import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { FPS, totalFrames } from "../src/timeline";
import { wordCount, wordWarning } from "./check-words";
import { advanceStatusBySlug } from "./curriculum";
import { prepare } from "./pipeline";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { lang: { type: "string" }, scale: { type: "string" }, out: { type: "string" } },
});

const slug = positionals[0];
if (!slug) {
  console.error("Usage: render <episode> --lang ru [--scale 0.25] [--out file.mp4]");
  process.exit(1);
}

const lang = values.lang ?? "ru";
const output = values.out ?? `out/${slug}.${lang}${values.scale ? ".preview" : ""}.mp4`;

const warning = wordWarning(lang, wordCount(slug, lang));
if (warning) console.warn(warning);

const { props, propsPath } = await prepare(slug, lang);

const result = spawnSync(
  "npx",
  ["remotion", "render", "src/index.ts", "Reel", output, `--props=${propsPath}`, `--scale=${values.scale ?? "1"}`, "--log=error"],
  { stdio: "inherit" },
);

if (result.status !== 0) process.exit(result.status ?? 1);
if (!values.scale) advanceStatusBySlug(slug, "rendered");
console.log(`${output} ${(totalFrames(props) / FPS).toFixed(1)}s`);
