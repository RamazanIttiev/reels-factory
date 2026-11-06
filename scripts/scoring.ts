import { isRecord, metricsPath, readJsonl, readVideos } from "./state";
import type { VideoRecord } from "./state";
import type { Experiment } from "./experiment";

export type MetricRow = { video_id: string; window_h: number; [key: string]: unknown };

const isMetricRow = (value: unknown): value is MetricRow =>
  isRecord(value) && typeof value.video_id === "string" && typeof value.window_h === "number";

export const readMetrics = (lang: string): MetricRow[] => readJsonl(metricsPath(lang)).filter(isMetricRow);

const numberOf = (row: MetricRow, key: string): number | undefined => {
  const value = row[key];
  return typeof value === "number" ? value : undefined;
};

export const rowAt = (rows: MetricRow[], videoId: string, windowH: number): MetricRow | undefined =>
  rows.filter((row) => row.video_id === videoId && row.window_h === windowH).at(-1);

export const latestRow = (rows: MetricRow[], videoId: string, windows: number[]): MetricRow | undefined =>
  [...windows]
    .sort((a, b) => b - a)
    .map((windowH) => rowAt(rows, videoId, windowH))
    .find((row) => row !== undefined);

const percentileRank = (value: number, all: number[]): number => {
  const below = all.filter((other) => other < value).length;
  const equal = all.filter((other) => other === value).length;
  return (below + 0.5 * equal) / all.length;
};

export type Scored = { video: VideoRecord; score: number | undefined; metricsUsed: string[] };

export const scoreVideos = (
  experiment: Experiment,
  videos: VideoRecord[],
  rows: MetricRow[],
  windows: number[],
): Scored[] => {
  const trailing = [...videos]
    .sort((a, b) => a.published_at.localeCompare(b.published_at))
    .slice(-experiment.composite_score.window_videos);
  const latest = trailing.map((video) => ({ video, row: latestRow(rows, video.video_id, windows) }));
  const entries = Object.entries(experiment.composite_score.weights);
  const populations = Object.fromEntries(
    entries.map(([metric]) => [
      metric,
      latest.flatMap(({ row }) => {
        const value = row ? numberOf(row, metric) : undefined;
        return value === undefined ? [] : [value];
      }),
    ]),
  );
  return latest.map(({ video, row }) => {
    const parts = entries.flatMap(([metric, weight]) => {
      const value = row ? numberOf(row, metric) : undefined;
      return value === undefined ? [] : [{ metric, weight, pct: percentileRank(value, populations[metric]) }];
    });
    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
    return {
      video,
      score: totalWeight === 0 ? undefined : parts.reduce((sum, part) => sum + part.weight * part.pct, 0) / totalWeight,
      metricsUsed: parts.map((part) => part.metric),
    };
  });
};

export type AttributeStat = { value: string; videos: number; scored: number; meanScore: number | undefined };

export const attributeStats = (scored: Scored[], attribute: string): AttributeStat[] => {
  const groups = scored.reduce<Map<string, Scored[]>>((acc, item) => {
    const raw = item.video[attribute];
    const key = typeof raw === "string" ? raw : String(raw);
    return acc.set(key, [...(acc.get(key) ?? []), item]);
  }, new Map());
  return [...groups.entries()]
    .map(([value, items]) => {
      const scores = items.flatMap((item) => (item.score === undefined ? [] : [item.score]));
      return {
        value,
        videos: items.length,
        scored: scores.length,
        meanScore: scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : undefined,
      };
    })
    .sort((a, b) => (b.meanScore ?? -1) - (a.meanScore ?? -1));
};

export const loadScored = (experiment: Experiment, lang: string): Scored[] =>
  scoreVideos(experiment, readVideos(lang), readMetrics(lang), [168, 72, 24]);
