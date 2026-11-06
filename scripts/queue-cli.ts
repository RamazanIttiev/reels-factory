import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadQueue, setState } from "./queue";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" }, all: { type: "boolean" }, note: { type: "string" } } });
const [command, ...slugs] = positionals;
const lang = values.lang ?? "ru";
const items = loadQueue(lang);

const pick = (state: string): string[] => (values.all ? items.filter((item) => item.state === state).map((item) => item.slug) : slugs);

if (command === "list") {
  console.log(items.map((item) => `${item.state.padEnd(18)} ${item.slug} (${item.category}, ${item.hook_type})${item.note ? ` - ${item.note}` : ""}`).join("\n") || "queue is empty");
} else if (command === "approve" || command === "reject") {
  const targets = pick("awaiting_approval");
  if (targets.length === 0) console.error("Give slugs or --all");
  targets.forEach((slug) => console.log(setState(lang, slug, command === "approve" ? "approved" : "rejected", values.note) ? `${slug} -> ${command}d` : `${slug}: not in queue`));
} else if (command === "render") {
  const targets = items.filter((item) => item.state === "approved");
  if (targets.length === 0) console.log("nothing approved to render");
  targets.forEach((item) => {
    console.log(`rendering ${item.slug}`);
    const result = spawnSync("npm", ["run", "-s", "render", "--", item.slug, "--lang", lang], { stdio: "inherit" });
    if (result.status === 0) setState(lang, item.slug, "rendered");
    else setState(lang, item.slug, "failed", "render failed or blocked by the fact gate");
  });
} else {
  console.error("Usage: queue <list|approve|reject|render> [slugs | --all] [--lang ru]");
  process.exit(1);
}
