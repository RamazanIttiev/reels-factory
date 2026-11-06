import { readFileSync } from "node:fs";
import { isRecord } from "./state";

export type Phase = {
  name: string;
  videos: string;
  min_videos_per_category?: number;
  min_videos_per_hook_type?: number;
  same_category_twice_in_a_row?: boolean;
  lessons_allowed: boolean;
};

export type Experiment = {
  phases: Phase[];
  composite_score: { window_videos: number; weights: Record<string, number> };
  promotion_rule: {
    min_videos_per_attribute_value: number;
    min_values_compared: number;
    confidence: number;
    must_hold_in_windows: number[];
    must_survive_removing_best_video: boolean;
  };
};

const isExperiment = (value: unknown): value is Experiment =>
  isRecord(value) && Array.isArray(value.phases) && isRecord(value.composite_score) && isRecord(value.promotion_rule);

export const loadExperiment = (): Experiment => {
  const parsed: unknown = JSON.parse(readFileSync("config/experiment.json", "utf8"));
  if (!isExperiment(parsed)) throw new Error("Invalid config/experiment.json");
  return parsed;
};

const phaseRange = (phase: Phase): { from: number; to: number } => {
  const [from, to] = phase.videos.split("-");
  return { from: Number(from), to: to === undefined ? Number.POSITIVE_INFINITY : Number(to) };
};

export const phaseFor = (experiment: Experiment, videoNumber: number): Phase => {
  const found = experiment.phases.find((phase) => {
    const { from, to } = phaseRange(phase);
    return videoNumber >= from && videoNumber <= to;
  });
  return found ?? experiment.phases[experiment.phases.length - 1];
};
