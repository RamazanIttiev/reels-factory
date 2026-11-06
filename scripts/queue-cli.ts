import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadQueue, setState } from "./queue";
import { pullQueue, pushQueue, pushReviewAssets } from "./queue-sync";
import { putFile, r2Configured, readyCoverKey, readyVideoKey } from "./r2";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" }, all: { type: "boolean" }, note: { type: "string" } } });
const [command, ...slugs] = positionals;
const lang = values.lang ?? "ru";
await pullQueue(lang);
const items = loadQueue(lang);

const pick = (state: string): string[] => (values.all ? items.filter((item) => item.state === state).map((item) => item.slug) : slugs);

if (command === "list") {
  console.log(items.map((item) => `${item.state.padEnd(18)} ${item.slug} (${item.category}, ${item.hook_type})${item.note ? ` - ${item.note}` : ""}`).join("\n") || "queue is empty");
} else if (command === "approve" || command === "reject") {
  const targets = pick("awaiting_approval");
  if (targets.length === 0) console.error("Give slugs or --all");
  targets.forEach((slug) => console.log(setState(lang, slug, command === "approve" ? "approved" : "rejected", values.note) ? `${slug} -> ${command}d` : `${slug}: not in queue`));
  await pushQueue(lang);
} else if (command === "render") {
  await pullQueue(lang);
  const targets = loadQueue(lang).filter((item) => item.state === "approved");
  if (targets.length === 0) console.log("nothing approved to render");
  for (const item of targets) {
    console.log(`rendering ${item.slug}`);
    const result = spawnSync("npm", ["run", "-s", "render", "--", item.slug, "--lang", lang], { stdio: "inherit" });
    if (result.status !== 0) {
      setState(lang, item.slug, "failed", "render failed or blocked by the fact gate");
      continue;
    }
    if (r2Configured()) {
      const cover = `covers/${item.slug}.${lang}.jpg`;
      if (!existsSync(cover)) spawnSync("npx", ["tsx", "scripts/cover.ts", item.slug, "--lang", lang], { stdio: "inherit" });
      await putFile(readyVideoKey(item.slug, lang), `out/${item.slug}.${lang}.mp4`, "video/mp4");
      await putFile(readyCoverKey(item.slug, lang), cover, "image/jpeg");
    }
    setState(lang, item.slug, "rendered");
  }
  await pushQueue(lang);
} else if (command === "pull" || command === "push") {
  if (command === "pull") await pullQueue(lang);
  else {
    await pushQueue(lang);
    for (const item of loadQueue(lang).filter((candidate) => candidate.state === "awaiting_approval")) await pushReviewAssets(lang, item.slug);
  }
} else {
  console.error("Usage: queue <list|approve|reject|render> [slugs | --all] [--lang ru]");
  process.exit(1);
}
