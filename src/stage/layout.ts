import type { MediaLayer } from "../types";
import { checksHeight, flowHeight, meterHeight, terminalHeight } from "./rich";

export const FPS = 30;
export const GAP = 28;
export const WIDTH = 960;
const MOVE_FRAMES = 9;
const LEAVE_FRAMES = 9;

export type Pose = { scale: number; top: number; ys: Record<number, number> };

export const heightOf = (layer: MediaLayer): number => {
  if (layer.kind === "table") return 82 + (layer.rows.length + 1) * 85;
  if (layer.kind === "page") return 290;
  if (layer.kind === "code") return layer.code.split("\n").length * 68 + 84;
  if (layer.kind === "card") return 140;
  if (layer.kind === "hub") return 560;
  if (layer.kind === "cards") return 220;
  if (layer.kind === "rack") return 230;
  if (layer.kind === "phone") return 520;
  if (layer.kind === "form") return 82 + 110 + layer.fields.length * 88 + 110;
  if (layer.kind === "bar") return 88;
  if (layer.kind === "flow") return flowHeight(layer);
  if (layer.kind === "terminal") return terminalHeight(layer);
  if (layer.kind === "meter") return meterHeight(layer);
  if (layer.kind === "checks") return checksHeight(layer);
  return 0;
};

const untilOf = (layer: MediaLayer): number | undefined => ("until" in layer ? layer.until : undefined);

const isFlow = (layer: MediaLayer): boolean => layer.kind !== "flyer";

export const eventTimes = (layers: MediaLayer[]): number[] =>
  [...new Set(layers.filter(isFlow).flatMap((layer) => [layer.at, untilOf(layer)].filter((time): time is number => time !== undefined)))].sort((a, b) => a - b);

export const poseAt = (layers: MediaLayer[], seconds: number, area: number): Pose => {
  const visible = layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => isFlow(layer) && layer.at <= seconds && (untilOf(layer) === undefined || seconds < (untilOf(layer) ?? 0)));
  const placed = visible.reduce<{ ys: Record<number, number>; cursor: number }>(
    (acc, { layer, index }) => ({ ys: { ...acc.ys, [index]: acc.cursor }, cursor: acc.cursor + heightOf(layer) + GAP }),
    { ys: {}, cursor: 0 },
  );
  const total = Math.max(1, placed.cursor - GAP);
  const scale = Math.min(1, area / total);
  return { scale, top: 0, ys: placed.ys };
};

const ease = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

export const poseAtFrame = (layers: MediaLayer[], frame: number, area: number): Pose | undefined => {
  const times = eventTimes(layers);
  const index = times.reduce((found, time, position) => (time * FPS <= frame ? position : found), -1);
  if (index < 0) return undefined;
  const now = poseAt(layers, times[index] + 0.001, area);
  const before = index > 0 ? poseAt(layers, times[index - 1] + 0.001, area) : now;
  const progress = ease((frame - times[index] * FPS) / MOVE_FRAMES);
  const recent = frame - times[index] * FPS < LEAVE_FRAMES;
  const ys = Object.fromEntries(
    [...new Set([...Object.keys(now.ys), ...(recent ? Object.keys(before.ys) : [])])].map((key) => {
      const id = Number(key);
      const target = now.ys[id];
      const origin = before.ys[id];
      return [id, target === undefined ? origin : origin === undefined ? target : mix(origin, target, progress)];
    }),
  );
  return { scale: mix(before.scale, now.scale, progress), top: mix(before.top, now.top, progress), ys };
};
