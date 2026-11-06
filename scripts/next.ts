import { parseArgs } from "node:util";
import { loadExperiment, phaseFor } from "./experiment";
import { attributeStats, loadScored } from "./scoring";
import { loadQueue } from "./queue";
import { readVideos } from "./state";
import { isTopicLang, loadTopics } from "./topics";
import type { Topic } from "./topics";

const { values } = parseArgs({ options: { lang: { type: "string" } } });
const lang = values.lang ?? "ru";
if (!isTopicLang(lang)) {
  console.error("Usage: next --lang ru");
  process.exit(1);
}

const experiment = loadExperiment();
const file = loadTopics();
const published = readVideos(lang);
const queued = loadQueue(lang);
const videos = [
  ...published,
  ...queued.filter((item) => item.state !== "failed" && item.state !== "rejected" && !published.some((video) => video.slug === item.slug)).map((item) => ({ category: item.category, hook_type: item.hook_type })),
];
const videoNumber = published.length + 1;
const phase = phaseFor(experiment, videoNumber);
const minCategory = phase.min_videos_per_category ?? 0;
const minHook = phase.min_videos_per_hook_type ?? 0;

const countBy = (attribute: "category" | "hook_type"): Map<string, number> =>
  videos.reduce((acc, video) => acc.set(video[attribute], (acc.get(video[attribute]) ?? 0) + 1), new Map<string, number>());

const categoryCounts = countBy("category");
const hookCounts = countBy("hook_type");
const lastCategory = videos.at(-1)?.category;

const skipped = new Set(queued.filter((item) => item.state === "failed" || item.state === "rejected").map((item) => item.slug));
const todo = file.topics.filter((topic) => topic.status[lang] === "todo" && !topic.legacy && !skipped.has(topic.slug));
const allowed = phase.same_category_twice_in_a_row === false ? todo.filter((topic) => topic.category !== lastCategory) : todo;
const pool = allowed.length ? allowed : todo;

const balanced = (topics: Topic[]): Topic[] =>
  [...topics].sort(
    (a, b) =>
      (categoryCounts.get(a.category) ?? 0) - (categoryCounts.get(b.category) ?? 0) ||
      (hookCounts.get(a.hook_type) ?? 0) - (hookCounts.get(b.hook_type) ?? 0) ||
      a.id - b.id,
  );

const exploitShare = phase.name === "learn" ? 7 : phase.name === "exploit" ? 8 : 0;
const ranked = attributeStats(loadScored(experiment, lang), "category").flatMap((stat) =>
  stat.meanScore === undefined ? [] : [stat.value],
);
const exploiting = exploitShare > 0 && ranked.length > 0 && videoNumber % 10 < exploitShare;
const bestPool = ranked.flatMap((category) => pool.filter((topic) => topic.category === category));
const chosen = (exploiting && bestPool.length ? bestPool : balanced(pool))[0];

if (!chosen) {
  console.log(`No todo topics for ${lang}.`);
  process.exit(0);
}

const imbalance = (label: string, counts: Map<string, number>, all: string[], min: number): string =>
  `${label}: ${all.map((key) => `${key} ${counts.get(key) ?? 0}${(counts.get(key) ?? 0) < min ? "!" : ""}`).join(", ")}`;

const categories = [...new Set(file.topics.map((topic) => topic.category))];
const hookTypes = [...new Set(file.topics.map((topic) => topic.hook_type))];
const hook = lang === "ru" ? chosen.hook_ru : chosen.hook_en;

console.log(
  [
    `NEXT ${lang} #${chosen.id} ${chosen.slug}`,
    `phase: ${phase.name}, video ${videoNumber}${exploiting ? " (exploit slot)" : phase.name === "explore" ? "" : " (exploration slot)"}`,
    `topic: ${chosen.title_en}`,
    `hook hypothesis (${chosen.hook_type}): ${hook}`,
    `sources to verify: ${chosen.sources.join(" | ") || "none listed"} [${chosen.sources_status}]`,
    `tags: category=${chosen.category} level=${chosen.level} kind=${chosen.kind} hook_type=${chosen.hook_type} visual=${chosen.visual}`,
    `scene_types: ${chosen.scene_types.join(", ")}`,
    ...(chosen.needs_legal_check ? ["needs_legal_check: human approval required before publish"] : []),
    ...(chosen.kind === "incident" ? ["incident: attribute claims to the operator's own report"] : []),
    `last published category: ${lastCategory ?? "none"} (not repeated in a row)`,
    imbalance(`category counts (min ${minCategory}, ! = below)`, categoryCounts, categories, minCategory),
    imbalance(`hook_type counts (min ${minHook}, ! = below)`, hookCounts, hookTypes, minHook),
    `files: episodes/${chosen.slug}/visual.${lang}.json, ${lang}.json (copy episodes/_template)`,
  ].join("\n"),
);
