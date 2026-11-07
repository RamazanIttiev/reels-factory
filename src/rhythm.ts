import type { MediaLayer, VisualScene } from "./types";

export const FPS = 30;
export const AUTO_AFTER = 1.2;
export const AUTO_EVERY = 1.0;
export const FAIL_GAP = 1.5;
export const SPREAD = 0.88;
const AUTO_TAIL = 0.35;
const HOOK_WORD_FRAMES = 4;
const HOOK_RING_SECONDS = 0.9;
const TYPE_STEP = 0.4;
const CODE_START = 10 / FPS;
const BROWSER_START = 20 / FPS;
const INTRO = 12 / FPS;

const unique = (times: number[]): number[] => [...new Set(times.map((time) => Math.round(time * 1000) / 1000))].sort((a, b) => a - b);

const range = (from: number, to: number, step: number): number[] =>
  Array.from({ length: Math.max(0, Math.floor((to - from) / step) + 1) }, (_, index) => from + index * step);

export const layerEvents = (layer: MediaLayer): number[] => {
  const nested =
    layer.kind === "hub" ? layer.satellites.map((item) => item.at)
    : layer.kind === "cards" ? layer.items.map((item) => item.at)
    : layer.kind === "phone" ? layer.messages.map((item) => item.at)
    : layer.kind === "form" ? [...layer.fields.map((item) => item.at), layer.click]
    : layer.kind === "flow" ? [...layer.nodes.map((item) => item.at), ...layer.edges.map((item) => item.at), ...(layer.marks ?? []).map((item) => item.at)]
    : layer.kind === "terminal" ? layer.lines.map((item) => item.at)
    : layer.kind === "meter" ? layer.rows.map((item) => item.at)
    : layer.kind === "checks" ? layer.items.map((item) => item.at)
    : layer.kind === "page" ? [layer.click]
    : [];
  return [layer.at, ...("until" in layer && layer.until !== undefined ? [layer.until] : []), ...nested];
};

export const hookEvents = (wordCount: number, durationSec: number): number[] =>
  unique([...Array.from({ length: wordCount }, (_, index) => (index * HOOK_WORD_FRAMES) / FPS), ...range(HOOK_RING_SECONDS, durationSec, HOOK_RING_SECONDS)]);

export const sceneEvents = (scene: VisualScene, durationSec: number): number[] => {
  const beats = (scene.beats ?? []).map((beat) => beat.at);
  const body = ((): number[] => {
    if (scene.type === "media") return scene.layers.flatMap(layerEvents);
    if (scene.type === "diagram") {
      const last = Math.max(1, ...scene.nodes.flatMap((node) => [node.step, node.badge?.step ?? 0]));
      const stepSeconds = (durationSec * SPREAD - INTRO) / last;
      return Array.from({ length: last }, (_, index) => INTRO + index * stepSeconds);
    }
    if (scene.type === "checklist") {
      const interval = (durationSec * SPREAD - INTRO) / scene.items.length;
      return scene.items.map((_, index) => INTRO + index * interval);
    }
    if (scene.type === "code") {
      const lines = scene.code.split("\n").length;
      const typed = range(CODE_START, durationSec * SPREAD * 0.8, ((durationSec * SPREAD * 0.8 - CODE_START) / lines) || 1);
      return [...typed, durationSec * SPREAD];
    }
    if (scene.type === "browser") return [...range(BROWSER_START, durationSec * SPREAD, TYPE_STEP), durationSec * SPREAD];
    return [];
  })();
  return unique([0, ...body, ...beats]);
};

export const maxGap = (events: number[], durationSec: number): { gap: number; from: number; to: number } =>
  [...unique([...events, durationSec])].reduce<{ gap: number; from: number; to: number; prev: number }>(
    (acc, time) => (time - acc.prev > acc.gap ? { gap: time - acc.prev, from: acc.prev, to: time, prev: time } : { ...acc, prev: time }),
    { gap: 0, from: 0, to: 0, prev: 0 },
  );

export const autoTimes = (events: number[], durationSec: number): number[] => {
  const marks = unique([0, ...events, durationSec]);
  return marks.slice(1).flatMap((next, index) => {
    const last = marks[index];
    return next - last > AUTO_AFTER ? range(last + AUTO_EVERY, next - AUTO_TAIL, AUTO_EVERY) : [];
  });
};

const PULSE_SECONDS = 0.55;

export const pulseAt = (seconds: number, times: number[]): number => {
  const age = times.map((time) => seconds - time).filter((delta) => delta >= 0 && delta < PULSE_SECONDS)[0];
  return age === undefined ? 0 : 1 - age / PULSE_SECONDS;
};

export const sweepAt = (seconds: number, times: number[]): number | undefined => {
  const age = times.map((time) => seconds - time).filter((delta) => delta >= 0 && delta < PULSE_SECONDS)[0];
  return age === undefined ? undefined : age / PULSE_SECONDS;
};
