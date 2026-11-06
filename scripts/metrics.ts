import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { instagramEnvNames, requireEnv } from "./env";
import { readMetrics } from "./scoring";
import { appendJsonl, isRecord, metricsPath, readVideos } from "./state";
import type { VideoRecord } from "./state";

const GRAPH_HOST = "https://graph.facebook.com";
const HOUR_MS = 3_600_000;

type ApiMetric = { api: string; field: string; scale: number };

const API_METRICS: ApiMetric[] = [
  { api: "reach", field: "reach", scale: 1 },
  { api: "views", field: "views", scale: 1 },
  { api: "likes", field: "likes", scale: 1 },
  { api: "comments", field: "comments", scale: 1 },
  { api: "shares", field: "shares", scale: 1 },
  { api: "saved", field: "saves", scale: 1 },
  { api: "ig_reels_avg_watch_time", field: "avg_watch_time_s", scale: 0.001 },
  { api: "ig_reels_video_view_total_time", field: "total_watch_time_s", scale: 0.001 },
];

const FIELDS = ["reach", "views", "likes", "comments", "shares", "saves", "follows", "avg_watch_time_s", "total_watch_time_s"];

const NOT_EXPOSED_FOR_REELS = ["follows"];

const fetchMetric = async (token: string, mediaId: string, metric: string): Promise<number | undefined> => {
  const version = process.env.GRAPH_API_VERSION ?? "v27.0";
  const response = await fetch(`${GRAPH_HOST}/${version}/${mediaId}/insights?metric=${metric}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json: unknown = await response.json();
  if (!response.ok || !isRecord(json) || !Array.isArray(json.data)) return undefined;
  const first: unknown = json.data[0];
  if (!isRecord(first) || !Array.isArray(first.values)) return undefined;
  const value: unknown = isRecord(first.values[0]) ? first.values[0].value : undefined;
  return typeof value === "number" ? value : undefined;
};

const perThousand = (value: number | null, reach: number | null): number | null =>
  value === null || reach === null || reach === 0 ? null : Math.round((value / reach) * 10_000) / 10;

const derive = (values: Record<string, number | null>, lengthS: number): Record<string, number | null> => {
  const avg = values.avg_watch_time_s;
  return {
    avg_watch_pct: avg === null || avg === undefined || lengthS <= 0 ? null : Math.round((avg / lengthS) * 1000) / 1000,
    shares_per_1k_reach: perThousand(values.shares ?? null, values.reach ?? null),
    saves_per_1k_reach: perThousand(values.saves ?? null, values.reach ?? null),
    follows_per_1k_reach: perThousand(values.follows ?? null, values.reach ?? null),
  };
};

const snapshot = async (video: VideoRecord, windowH: number): Promise<Record<string, unknown>> => {
  const mediaId = String(video.ig_media_id);
  const token = requireEnv(instagramEnvNames(lang).token);
  const results = await Promise.all(API_METRICS.map(async (metric) => ({ metric, value: await fetchMetric(token, mediaId, metric.api) })));
  const values: Record<string, number | null> = {
    ...Object.fromEntries(FIELDS.map((field) => [field, null])),
    ...Object.fromEntries(results.map(({ metric, value }) => [metric.field, value === undefined ? null : value * metric.scale])),
  };
  const unavailable = [...results.filter(({ value }) => value === undefined).map(({ metric }) => metric.field), ...NOT_EXPOSED_FOR_REELS];
  return {
    video_id: video.video_id,
    platform: "instagram",
    window_h: windowH,
    fetched_at: new Date().toISOString(),
    source: "api",
    ...values,
    ...derive(values, video.length_s),
    unavailable,
  };
};

const parseCsv = (path: string): Record<string, string>[] => {
  const [header, ...lines] = readFileSync(path, "utf8").split("\n").filter((line) => line.trim());
  const names = header.split(",").map((name) => name.trim());
  return lines.map((line) => Object.fromEntries(line.split(",").map((cell, index) => [names[index], cell.trim()])));
};

const importCsv = (lang: string, path: string): void => {
  const videos = readVideos(lang);
  parseCsv(path).forEach((row) => {
    const video = videos.find((candidate) => candidate.video_id === row.video_id);
    const windowH = Number(row.window_h);
    if (!video || ![24, 72, 168, 672].includes(windowH)) throw new Error(`Bad row: ${JSON.stringify(row)}`);
    const values: Record<string, number | null> = Object.fromEntries(
      FIELDS.map((field) => [field, row[field] === undefined || row[field] === "" ? null : Number(row[field])]),
    );
    appendJsonl(metricsPath(lang), {
      video_id: video.video_id,
      platform: "instagram",
      window_h: windowH,
      fetched_at: new Date().toISOString(),
      source: "manual",
      ...values,
      ...derive(values, video.length_s),
      unavailable: FIELDS.filter((field) => values[field] === null),
    });
    console.log(`imported ${video.video_id} @${windowH}h`);
  });
};

const { values } = parseArgs({
  options: { lang: { type: "string" }, import: { type: "string" }, "dry-run": { type: "boolean" } },
});
const lang = values.lang ?? "ru";

if (values.import) {
  importCsv(lang, values.import);
  process.exit(0);
}

const windows = loadExperiment_windows();
const existing = readMetrics(lang);
const now = Date.now();
const due = readVideos(lang).flatMap((video) =>
  windows
    .filter((windowH) => !existing.some((row) => row.video_id === video.video_id && row.window_h === windowH))
    .filter((windowH) => now >= new Date(video.published_at).getTime() + windowH * HOUR_MS)
    .map((windowH) => ({ video, windowH })),
);

function loadExperiment_windows(): number[] {
  const raw: unknown = JSON.parse(readFileSync("config/experiment.json", "utf8"));
  const list = isRecord(raw) && Array.isArray(raw.measurement_windows_hours) ? raw.measurement_windows_hours : [];
  return list.filter((item): item is number => typeof item === "number");
}


for (const { video, windowH } of due) {
  if (!video.ig_media_id) {
    console.warn(`skip ${video.video_id} @${windowH}h: no ig_media_id (enter it by hand or use metrics:import)`);
    continue;
  }
  if (values["dry-run"]) {
    console.log(`dry run: would fetch ${video.video_id} @${windowH}h`);
    continue;
  }
  const row = await snapshot(video, windowH);
  appendJsonl(metricsPath(lang), row);
  console.log(`${video.video_id} @${windowH}h saved, unavailable: ${String(row.unavailable)}`);
}
if (due.length === 0) console.log("nothing due");
