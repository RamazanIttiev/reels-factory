import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { prepare } from "./pipeline";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { lang: { type: "string" }, count: { type: "string" }, ids: { type: "string" } },
});

const slug = positionals[0];
if (!slug) {
  console.error("Usage: frames <episode> --lang ru [--count 3] [--ids hook,lock,fixes]");
  process.exit(1);
}

const lang = values.lang ?? "ru";
const count = Number(values.count ?? 3);
const { props, propsPath } = await prepare(slug, lang);

const starts = props.segments.map((_, index) =>
  props.segments.slice(0, index).reduce((sum, segment) => sum + segment.duration, 0),
);
const wanted = values.ids?.split(",");
const indexes = wanted
  ? props.segments.flatMap((segment, index) => (wanted.includes(segment.id) ? [index] : []))
  : Array.from({ length: count }, (_, i) =>
      count === 1 ? 0 : Math.round((i * (props.segments.length - 1)) / (count - 1)),
    );

mkdirSync("frames", { recursive: true });
const outputs = indexes.map((index) => {
  const output = `frames/${slug}.${lang}.${props.segments[index].id}.png`;
  const frame = starts[index] + Math.floor(props.segments[index].duration * 0.85);
  const result = spawnSync(
    "npx",
    ["remotion", "still", "src/index.ts", "Reel", output, `--frame=${frame}`, `--props=${propsPath}`, "--log=error"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  return output;
});

console.log(outputs.join("\n"));
