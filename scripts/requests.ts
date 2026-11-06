import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { instagramEnvNames, requireEnv } from "./env";
import { appendJsonl, isRecord, readJsonl, readVideos, requestsPath } from "./state";

const GRAPH_HOST = "https://graph.facebook.com";
const REQUEST_PATTERN = /разбер|расскаж|сделай|сделайте|объясн|покаж|хочу|хотелось бы|про\s|can you|could you|please (do|make|explain|cover)|more on|explain|how does|how do|what is|i want|would love/i;

const knownIds = (lang: string): Set<string> =>
  new Set(readJsonl(requestsPath(lang)).flatMap((row) => (isRecord(row) && typeof row.comment_id === "string" ? [row.comment_id] : [])));

const parseCsv = (path: string): { comment_id: string; video_id: string; text: string }[] =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .slice(1)
    .map((line) => {
      const [comment_id, video_id, ...rest] = line.split(",");
      return { comment_id: comment_id.trim(), video_id: video_id.trim(), text: rest.join(",").trim() };
    });

const { values } = parseArgs({ options: { lang: { type: "string" }, import: { type: "string" } } });
const lang = values.lang ?? "ru";
const videos = readVideos(lang);
const seen = knownIds(lang);

const save = (comment: { comment_id: string; video_id: string; text: string }, source: string): boolean => {
  const video = videos.find((candidate) => candidate.video_id === comment.video_id);
  if (!video || seen.has(comment.comment_id) || !REQUEST_PATTERN.test(comment.text)) return false;
  appendJsonl(requestsPath(lang), {
    ...comment,
    topic_text: comment.text,
    video_category: video.category,
    fetched_at: new Date().toISOString(),
    source,
  });
  return true;
};

if (values.import) {
  const saved = parseCsv(values.import).filter((comment) => save(comment, "manual")).length;
  console.log(`imported ${saved} requests (CSV columns: comment_id,video_id,text)`);
  process.exit(0);
}

const version = process.env.GRAPH_API_VERSION ?? "v27.0";
const token = requireEnv(instagramEnvNames(lang).token);
const total = await videos.filter((video) => video.ig_media_id).reduce(async (previous, video) => {
  const count = await previous;
  const response = await fetch(`${GRAPH_HOST}/${version}/${String(video.ig_media_id)}/comments?fields=id,text`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: unknown = await response.json();
  if (!response.ok || !isRecord(json) || !Array.isArray(json.data)) {
    console.error(`${video.video_id}: comments not available (needs instagram_manage_comments). Use: npm run requests -- --import file.csv`);
    return count;
  }
  const fresh = json.data.filter(isRecord).filter((item) => typeof item.id === "string" && typeof item.text === "string")
    .filter((item) => save({ comment_id: String(item.id), video_id: video.video_id, text: String(item.text) }, "api")).length;
  return count + fresh;
}, Promise.resolve(0));
console.log(`saved ${total} new topic requests`);
