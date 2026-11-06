import { readFileSync, writeFileSync } from "node:fs";

export const TOPICS_PATH = "plan/topics.json";
export const TAXONOMY_PATH = "plan/taxonomy.json";

export const STATUSES = ["todo", "drafted", "rendered", "published"] as const;

export type Status = (typeof STATUSES)[number];

export const LANGS = ["ru", "en"] as const;

export type TopicLang = (typeof LANGS)[number];

export type Topic = {
  id: number;
  slug: string;
  category: string;
  level: string;
  kind: string;
  title_en: string;
  hook_en: string;
  hook_ru: string;
  hook_type: string;
  visual: string;
  sources: string[];
  sources_status: string;
  status: Record<TopicLang, Status>;
  fact_sheet: string | null;
  scene_types: string[];
  needs_legal_check?: boolean;
  legacy?: boolean;
};

export type TopicsFile = { _note?: string; version: number; topics: Topic[] };

export const isStatus = (value: string): value is Status => STATUSES.some((status) => status === value);

export const isTopicLang = (value: string): value is TopicLang => LANGS.some((lang) => lang === value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTopic = (value: unknown): value is Topic =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.slug === "string" &&
  typeof value.category === "string" &&
  isRecord(value.status) &&
  Array.isArray(value.sources) &&
  Array.isArray(value.scene_types);

const isTopicsFile = (value: unknown): value is TopicsFile =>
  isRecord(value) && Array.isArray(value.topics) && value.topics.every(isTopic);

export const loadTopics = (): TopicsFile => {
  const parsed: unknown = JSON.parse(readFileSync(TOPICS_PATH, "utf8"));
  if (!isTopicsFile(parsed)) throw new Error(`Invalid ${TOPICS_PATH}`);
  return parsed;
};

export const saveTopics = (file: TopicsFile): void => {
  writeFileSync(TOPICS_PATH, `${JSON.stringify(file, null, 1)}\n`);
};

export const findTopic = (file: TopicsFile, slug: string): Topic | undefined =>
  file.topics.find((topic) => topic.slug === slug);

export const withStatus = (file: TopicsFile, slug: string, lang: TopicLang, status: Status): TopicsFile => ({
  ...file,
  topics: file.topics.map((topic) =>
    topic.slug === slug ? { ...topic, status: { ...topic.status, [lang]: status } } : topic,
  ),
});

const RANK: Record<Status, number> = { todo: 0, drafted: 1, rendered: 2, published: 3 };

export const advanceStatus = (slug: string, lang: string, status: Status): boolean => {
  const file = loadTopics();
  const topic = findTopic(file, slug);
  if (!topic || !isTopicLang(lang)) return false;
  if (RANK[topic.status[lang]] < RANK[status]) saveTopics(withStatus(file, slug, lang, status));
  return true;
};

export const setStatus = (slug: string, lang: string, status: Status): boolean => {
  const file = loadTopics();
  if (!findTopic(file, slug) || !isTopicLang(lang)) return false;
  saveTopics(withStatus(file, slug, lang, status));
  return true;
};

export type Taxonomy = {
  attributes: {
    category: string[];
    level: string[];
    kind: string[];
    hook_type: Record<string, string>;
    visual: string[];
    cta_type: string[];
    post_slot: string[];
  };
  visual_to_scene_types: Record<string, string[]>;
};

const isTaxonomy = (value: unknown): value is Taxonomy =>
  isRecord(value) && isRecord(value.attributes) && isRecord(value.visual_to_scene_types);

export const loadTaxonomy = (): Taxonomy => {
  const parsed: unknown = JSON.parse(readFileSync(TAXONOMY_PATH, "utf8"));
  if (!isTaxonomy(parsed)) throw new Error(`Invalid ${TAXONOMY_PATH}`);
  return parsed;
};

export const publicEntries = <T>(record: Record<string, T>): [string, T][] =>
  Object.entries(record).filter(([key]) => !key.startsWith("_"));
