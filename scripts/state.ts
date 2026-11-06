import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export const stateDir = (lang: string): string => `state/${lang}`;

export const videosPath = (lang: string): string => `${stateDir(lang)}/videos.jsonl`;

export const metricsPath = (lang: string): string => `${stateDir(lang)}/metrics.jsonl`;

export const requestsPath = (lang: string): string => `${stateDir(lang)}/requests.jsonl`;

export const observationsPath = (lang: string): string => `${stateDir(lang)}/observations.md`;

export const readJsonl = (path: string): unknown[] =>
  existsSync(path)
    ? readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line): unknown => JSON.parse(line))
    : [];

export const appendJsonl = (path: string, record: Record<string, unknown>): void => {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`);
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export type VideoRecord = {
  video_id: string;
  topic_id: number;
  slug: string;
  language: string;
  ig_media_id: string | null;
  published_at: string;
  length_s: number;
  category: string;
  hook_type: string;
  [key: string]: unknown;
};

const isVideoRecord = (value: unknown): value is VideoRecord =>
  isRecord(value) &&
  typeof value.video_id === "string" &&
  typeof value.slug === "string" &&
  typeof value.category === "string" &&
  typeof value.hook_type === "string" &&
  typeof value.published_at === "string";

export const readVideos = (lang: string): VideoRecord[] => readJsonl(videosPath(lang)).filter(isVideoRecord);
