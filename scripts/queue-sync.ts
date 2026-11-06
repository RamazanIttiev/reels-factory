import { existsSync, readdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { estimatedSeconds, wordCount } from "./check-words";
import { loadLang } from "./load-episode";
import { getText, putFile, putText, queueKey, r2Configured, reviewKey } from "./r2";
import { loadQueue, saveQueue, type QueueItem } from "./queue";
import { mergeQueues } from "./queue-merge";
import { isRecord } from "./state";

const isItems = (value: unknown): value is QueueItem[] => Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.slug === "string");

const readRemote = async (lang: string): Promise<QueueItem[]> => {
  const text = await getText(queueKey(lang));
  if (!text) return [];
  const parsed: unknown = JSON.parse(text);
  if (!isItems(parsed)) throw new Error(`Invalid ${queueKey(lang)} in R2`);
  return parsed;
};

export const pullQueue = async (lang: string): Promise<void> => {
  if (!r2Configured()) return;
  saveQueue(lang, mergeQueues(loadQueue(lang), await readRemote(lang)));
};

export const pushQueue = async (lang: string): Promise<void> => {
  if (!r2Configured()) return;
  const merged = mergeQueues(loadQueue(lang), await readRemote(lang));
  saveQueue(lang, merged);
  await putText(queueKey(lang), `${JSON.stringify(merged, null, 2)}\n`);
};

export const pushReviewAssets = async (lang: string, slug: string): Promise<void> => {
  if (!r2Configured() || !existsSync("frames")) return;
  const prefix = `${slug}.${lang}.`;
  const files = readdirSync("frames").filter((name) => name.startsWith(prefix) && name.endsWith(".png"));
  for (const name of files) await putFile(reviewKey(slug, lang, name.slice(prefix.length)), `frames/${name}`, "image/png");
  const language = loadLang(slug, lang);
  const words = wordCount(slug, lang);
  const meta = {
    hook: language.hook.text,
    caption: language.caption,
    narration: Object.values(language.scenes).map((scene) => scene.narration),
    words,
    seconds: estimatedSeconds(words, lang),
    frames: files.map((name) => name.slice(prefix.length)),
  };
  await putText(reviewKey(slug, lang, "meta.json"), JSON.stringify(meta));
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("queue-sync.ts")) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" } } });
  const lang = values.lang ?? "ru";
  const [command] = positionals;
  if (!r2Configured()) {
    console.error("R2 is not configured in .env");
    process.exit(1);
  }
  if (command === "pull") await pullQueue(lang);
  else if (command === "push") {
    await pushQueue(lang);
    for (const item of loadQueue(lang).filter((candidate) => candidate.state === "awaiting_approval")) await pushReviewAssets(lang, item.slug);
  } else {
    console.error("Usage: queue-sync <pull|push> [--lang ru]");
    process.exit(1);
  }
  console.log(`queue ${command} done (${loadQueue(lang).length} items)`);
}
