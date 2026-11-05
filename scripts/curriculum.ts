import { readFileSync, writeFileSync } from "node:fs";

export const PLAN_PATH = "plan/curriculum.json";

export const STATUSES = ["todo", "drafted", "rendered", "published"] as const;

export type Status = (typeof STATUSES)[number];

export type PlanEpisode = {
  id: number;
  slug: string;
  module: number;
  indexInModule: number;
  moduleTotal: number;
  title_ru: string;
  key_idea: string;
  shop_example: string;
  hook_ru: string;
  scene_types: string[];
  prerequisites: number[];
  references: number[];
  introduces: string[];
  comment_question_ru?: string;
  status: Status;
};

export type PlanModule = { id: number; title_ru: string; users: string; problem_ru: string };

export type Curriculum = { modules: PlanModule[]; episodes: PlanEpisode[] };

export const isStatus = (value: string): value is Status => STATUSES.some((status) => status === value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCurriculum = (value: unknown): value is Curriculum =>
  isRecord(value) && Array.isArray(value.modules) && Array.isArray(value.episodes);

export const loadPlan = (): Curriculum => {
  const parsed: unknown = JSON.parse(readFileSync(PLAN_PATH, "utf8"));
  if (!isCurriculum(parsed)) throw new Error(`Invalid ${PLAN_PATH}`);
  return parsed;
};

export const savePlan = (plan: Curriculum): void => {
  writeFileSync(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`);
};

export const withStatus = (plan: Curriculum, id: number, status: Status): Curriculum => ({
  ...plan,
  episodes: plan.episodes.map((episode) => (episode.id === id ? { ...episode, status } : episode)),
});

const RANK: Record<Status, number> = { todo: 0, drafted: 1, rendered: 2, published: 3 };

export const advanceStatusBySlug = (slug: string, status: Status): number | undefined => {
  const plan = loadPlan();
  const episode = plan.episodes.find((candidate) => candidate.slug === slug);
  if (!episode) return undefined;
  if (RANK[episode.status] >= RANK[status]) return episode.id;
  savePlan(withStatus(plan, episode.id, status));
  return episode.id;
};
