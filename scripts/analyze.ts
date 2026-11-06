import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { loadExperiment, phaseFor } from "./experiment";
import type { Experiment } from "./experiment";
import { attributeStats, readMetrics, scoreVideos } from "./scoring";
import type { Scored } from "./scoring";
import { observationsPath, readVideos } from "./state";

const ATTRIBUTES = ["category", "hook_type", "kind", "level", "post_slot", "visual"];
const BOOTSTRAP_ROUNDS = 2000;

const seeded = (seed: number) => {
  const state = { value: seed };
  return (): number => {
    state.value = (state.value + 0x6d2b79f5) | 0;
    const t = Math.imul(state.value ^ (state.value >>> 15), 1 | state.value);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
};

const mean = (numbers: number[]): number => numbers.reduce((sum, n) => sum + n, 0) / numbers.length;

const scoresOf = (items: Scored[]): number[] => items.flatMap((item) => (item.score === undefined ? [] : [item.score]));

const winProbability = (best: number[], rest: number[]): number => {
  const random = seeded(42);
  const draw = (pool: number[]): number => mean(pool.map(() => pool[Math.floor(random() * pool.length)]));
  const wins = Array.from({ length: BOOTSTRAP_ROUNDS }, () => draw(best) - draw(rest)).filter((diff) => diff > 0).length;
  return wins / BOOTSTRAP_ROUNDS;
};

const groupBy = (scored: Scored[], attribute: string): Map<string, Scored[]> =>
  scored.reduce((acc, item) => acc.set(String(item.video[attribute]), [...(acc.get(String(item.video[attribute])) ?? []), item]), new Map<string, Scored[]>());

type Candidate = { attribute: string; value: string; reasons: string[] };

const candidatesFor = (experiment: Experiment, lang: string, attribute: string): Candidate[] => {
  const rule = experiment.promotion_rule;
  const videos = readVideos(lang);
  const rows = readMetrics(lang);
  const byWindow = rule.must_hold_in_windows.map((windowH) => ({ windowH, scored: scoreVideos(experiment, videos, rows, [windowH]) }));
  const base = byWindow[0]?.scored ?? [];
  const groups = [...groupBy(base, attribute).entries()].filter(([, items]) => scoresOf(items).length >= rule.min_videos_per_attribute_value);
  if (groups.length < rule.min_values_compared) return [];
  const best = groups.map(([value, items]) => ({ value, mean: mean(scoresOf(items)) })).sort((a, b) => b.mean - a.mean)[0];
  const holds = byWindow.map(({ windowH, scored }) => {
    const inBest = scored.filter((item) => String(item.video[attribute]) === best.value);
    const rest = scored.filter((item) => String(item.video[attribute]) !== best.value);
    const p = winProbability(scoresOf(inBest), scoresOf(rest));
    const trimmed = [...scoresOf(inBest)].sort((a, b) => b - a).slice(1);
    const pTrimmed = rule.must_survive_removing_best_video && trimmed.length ? winProbability(trimmed, scoresOf(rest)) : p;
    return { windowH, p, pTrimmed, ok: p >= rule.confidence && pTrimmed >= rule.confidence };
  });
  return holds.every((hold) => hold.ok)
    ? [{ attribute, value: best.value, reasons: holds.map((hold) => `${hold.windowH}h: P(better)=${hold.p.toFixed(2)}, without best video ${hold.pTrimmed.toFixed(2)}`) }]
    : [];
};

const { values } = parseArgs({ options: { lang: { type: "string" } } });
const lang = values.lang ?? "ru";
const experiment = loadExperiment();
const videos = readVideos(lang);
const phase = phaseFor(experiment, videos.length + 1);
const scored = scoreVideos(experiment, videos, readMetrics(lang), [168, 72, 24]);
const withScore = scored.filter((item) => item.score !== undefined).length;

const lines = [
  `${lang}: ${videos.length} videos, ${withScore} with metrics, phase ${phase.name}, lessons ${phase.lessons_allowed ? "allowed" : "NOT allowed"}`,
  ...ATTRIBUTES.flatMap((attribute) => [
    `${attribute}:`,
    ...attributeStats(scored, attribute).map(
      (stat, index) => `  ${stat.meanScore === undefined ? "-" : String(index + 1)}. ${stat.value}: ${stat.videos} videos (${stat.scored} scored), composite ${stat.meanScore === undefined ? "n/a" : stat.meanScore.toFixed(2)}`,
    ),
  ]),
];

if (!phase.lessons_allowed) {
  mkdirSync(dirname(observationsPath(lang)), { recursive: true });
  appendFileSync(observationsPath(lang), `\n## ${new Date().toISOString().slice(0, 10)}\n${lines.map((line) => `- ${line}`).join("\n")}\n`);
  console.log(lines.join("\n"));
  console.log(`\nexplore phase: observations appended to ${observationsPath(lang)}, no lessons.`);
} else {
  const candidates = ATTRIBUTES.flatMap((attribute) => candidatesFor(experiment, lang, attribute));
  console.log(lines.join("\n"));
  console.log(
    candidates.length
      ? `\nlesson candidates (promotion_rule met, NOT saved, need your yes):\n${candidates.map((c) => `  ${c.attribute}=${c.value}\n    ${c.reasons.join("\n    ")}`).join("\n")}`
      : "\nno lesson candidates: promotion_rule not met",
  );
}
