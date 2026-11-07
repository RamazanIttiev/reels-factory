import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { FPS, totalFrames } from "../src/timeline";
import type { ReelProps } from "../src/timeline";
import { wordCount } from "./check-words";
import { loadExperiment, phaseFor } from "./experiment";
import { factSheetHash } from "./facts";
import { loadLang } from "./load-episode";
import { appendJsonl, readVideos, videosPath, isRecord } from "./state";
import { findTopic, isTopicLang, loadTopics } from "./topics";

export type RecordInput = {
  slug: string;
  lang: string;
  igMediaId?: string;
  publishedAt?: string;
  lengthS?: number;
  postSlot?: string;
  manual?: boolean;
};

const audienceTz = (lang: string): string => {
  const raw: unknown = JSON.parse(readFileSync("config/schedule.json", "utf8"));
  const languages = isRecord(raw) && isRecord(raw.languages) ? raw.languages : {};
  const entry = languages[lang];
  if (isRecord(entry) && typeof entry.timezone === "string") return entry.timezone;
  return isRecord(raw) && typeof raw.timezone === "string" ? raw.timezone : "UTC";
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const localParts = (iso: string, lang: string): { hour: number; weekday: number } => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: audienceTz(lang), hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const weekday = WEEKDAYS.indexOf(parts.find((part) => part.type === "weekday")?.value ?? "Sun");
  return { hour, weekday };
};

export const slotOf = (hour: number): string =>
  hour >= 5 && hour < 11 ? "morning" : hour >= 11 && hour < 17 ? "midday" : hour >= 17 && hour < 23 ? "evening" : "night";

const propsLength = (slug: string, lang: string): number | undefined => {
  const path = `.cache/props/${slug}.${lang}.json`;
  if (!existsSync(path)) return undefined;
  const props: ReelProps = JSON.parse(readFileSync(path, "utf8"));
  return Math.round((totalFrames(props) / FPS) * 10) / 10;
};

export const recordVideo = (input: RecordInput): Record<string, unknown> => {
  const { slug, lang } = input;
  if (!isTopicLang(lang)) throw new Error(`Unknown language ${lang}`);
  const topic = findTopic(loadTopics(), slug);
  if (!topic) throw new Error(`No topic with slug ${slug}`);
  const videoId = `${slug}.${lang}`;
  const videos = readVideos(lang);
  if (videos.some((video) => video.video_id === videoId)) throw new Error(`${videoId} is already in ${videosPath(lang)}`);

  const language = loadLang(slug, lang);
  const publishedAt = input.publishedAt ?? new Date().toISOString();
  const { hour, weekday } = localParts(publishedAt, lang);
  const lengthS = input.lengthS ?? propsLength(slug, lang);
  if (lengthS === undefined) throw new Error(`No length: render first or pass --length-s`);
  const hash = factSheetHash(slug);
  const hookWords = language.hook.text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const experiment = loadExperiment();

  const record = {
    video_id: videoId,
    topic_id: topic.id,
    slug,
    language: lang,
    ig_media_id: input.igMediaId ?? null,
    ...(input.igMediaId ? {} : { ig_media_id_note: "enter by hand: Instagram media id was not captured by publish.ts" }),
    published_at: publishedAt,
    ...(input.manual && !input.publishedAt ? { published_at_note: "record created by hand: real publish time unknown, correct it" } : {}),
    length_s: lengthS,
    ...(input.lengthS === undefined ? { length_note: "estimated from .cache props (mock audio is not real duration); correct by hand if needed" } : {}),
    word_count: wordCount(slug, lang),
    category: topic.category,
    level: topic.level,
    kind: topic.kind,
    hook_type: topic.hook_type,
    hook_text: language.hook.text,
    hook_words: hookWords,
    hook_has_number: /\d/.test(language.hook.text),
    hook_is_question: language.hook.text.trim().endsWith("?"),
    visual: topic.visual,
    opening_frame: "text_hook",
    cta_type: "follow",
    caption_style: "one_word",
    voice_id: language.voiceId,
    post_slot: input.postSlot ?? slotOf(hour),
    weekday,
    hashtags_count: (language.caption.match(/#\S+/g) ?? []).length,
    caption_chars: language.caption.length,
    phase: phaseFor(experiment, videos.length + 1).name,
    experiment_id: null,
    hypothesis: null,
    fact_sheet_hash: hash ?? "none:legacy",
    approved_by: "human",
    human_edits_count: 0,
    ai_label: true,
  };
  appendJsonl(videosPath(lang), record);
  return record;
};

const isMain = process.argv[1]?.endsWith("record.ts") ?? false;

if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      lang: { type: "string" },
      "ig-media-id": { type: "string" },
      "published-at": { type: "string" },
      "length-s": { type: "string" },
      slot: { type: "string" },
    },
  });
  const slug = positionals[0];
  if (!slug) {
    console.error("Usage: record <slug> --lang ru [--ig-media-id ID] [--published-at ISO] [--length-s N] [--slot morning|midday|evening|night]");
    process.exit(1);
  }
  try {
    const record = recordVideo({
      slug,
      lang: values.lang ?? "ru",
      igMediaId: values["ig-media-id"],
      publishedAt: values["published-at"],
      lengthS: values["length-s"] ? Number(values["length-s"]) : undefined,
      postSlot: values.slot,
      manual: true,
    });
    console.log(`recorded ${String(record.video_id)} in ${videosPath(values.lang ?? "ru")}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
