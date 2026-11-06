import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { isRecord, stateDir } from "./state";

export const QUEUE_STATES = ["awaiting_approval", "approved", "rejected", "rendered", "published", "failed"] as const;

export type QueueState = (typeof QUEUE_STATES)[number];

export type QueueItem = { slug: string; category: string; hook_type: string; state: QueueState; added: string; note?: string };

export const queuePath = (lang: string): string => `${stateDir(lang)}/queue.json`;

const isItem = (value: unknown): value is QueueItem =>
  isRecord(value) &&
  typeof value.slug === "string" &&
  typeof value.category === "string" &&
  typeof value.hook_type === "string" &&
  typeof value.state === "string" &&
  QUEUE_STATES.some((state) => state === value.state);

export const loadQueue = (lang: string): QueueItem[] => {
  if (!existsSync(queuePath(lang))) return [];
  const parsed: unknown = JSON.parse(readFileSync(queuePath(lang), "utf8"));
  if (!Array.isArray(parsed) || !parsed.every(isItem)) throw new Error(`Invalid ${queuePath(lang)}`);
  return parsed;
};

export const saveQueue = (lang: string, items: QueueItem[]): void => {
  mkdirSync(dirname(queuePath(lang)), { recursive: true });
  writeFileSync(queuePath(lang), `${JSON.stringify(items, null, 2)}\n`);
};

export const upsert = (lang: string, item: Omit<QueueItem, "added"> & { added?: string }): void => {
  const items = loadQueue(lang);
  const existing = items.find((candidate) => candidate.slug === item.slug);
  saveQueue(
    lang,
    existing
      ? items.map((candidate) => (candidate.slug === item.slug ? { ...candidate, ...item, added: candidate.added } : candidate))
      : [...items, { ...item, added: item.added ?? new Date().toISOString() }],
  );
};

export const setState = (lang: string, slug: string, state: QueueState, note?: string): boolean => {
  const items = loadQueue(lang);
  if (!items.some((item) => item.slug === slug)) return false;
  saveQueue(lang, items.map((item) => (item.slug === slug ? { ...item, state, ...(note ? { note } : {}) } : item)));
  return true;
};
