import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { lang: { type: "string" }, count: { type: "string" } } });
const lang = values.lang ?? "ru";
const count = Number(values.count ?? 5);

const results = Array.from({ length: count }).reduce<string[]>((done, _, index) => {
  console.log(`\n=== batch ${index + 1}/${count} ===`);
  const result = spawnSync("npm", ["run", "-s", "make", "--", "--lang", lang], { stdio: "inherit" });
  return [...done, result.status === 0 ? "ok" : "failed"];
}, []);

console.log(`\nbatch done: ${results.filter((r) => r === "ok").length} ready, ${results.filter((r) => r === "failed").length} failed. Review: npm run review -- --lang ${lang}`);
