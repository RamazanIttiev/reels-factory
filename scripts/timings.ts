import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { alignSpans, uniformSpans } from "../src/timeline";
import type { NarrationToken, WordSpan } from "../src/timeline";

export type TimingInput = {
  audioPath: string;
  tokens: NarrationToken[];
  durationSec: number;
  providerSpans?: WordSpan[];
};

const TIMINGS_DIR = ".cache/timings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSpanArray = (value: unknown): value is WordSpan[] =>
  Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.startSec === "number");

const parseWhisper = (value: unknown): WordSpan[] | undefined => {
  if (!isRecord(value) || !Array.isArray(value.transcription)) return undefined;
  return value.transcription.flatMap((entry: unknown) =>
    isRecord(entry) &&
    isRecord(entry.offsets) &&
    typeof entry.offsets.from === "number" &&
    typeof entry.offsets.to === "number"
      ? [{ startSec: entry.offsets.from / 1000, endSec: entry.offsets.to / 1000 }]
      : [],
  );
};

const whisperSpans = (audioPath: string, bin: string, model: string): WordSpan[] | undefined => {
  const wav = `${audioPath}.16k.wav`;
  const output = `${audioPath}.whisper`;
  const convert = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-i", audioPath, "-ar", "16000", "-ac", "1", wav], { stdio: "ignore" });
  if (convert.status !== 0) return undefined;
  const run = spawnSync(bin, ["-m", model, "-f", wav, "-ml", "1", "-sow", "-oj", "-of", output], { stdio: "ignore" });
  if (run.status !== 0) return undefined;
  return parseWhisper(JSON.parse(readFileSync(`${output}.json`, "utf8")));
};

const computeSpans = ({ audioPath, tokens, durationSec, providerSpans }: TimingInput): WordSpan[] => {
  if (providerSpans) return alignSpans(tokens, providerSpans, durationSec);
  const bin = process.env.WHISPER_CPP_BIN;
  const model = process.env.WHISPER_CPP_MODEL;
  const recognized = bin && model ? whisperSpans(audioPath, bin, model) : undefined;
  return recognized ? alignSpans(tokens, recognized, durationSec) : uniformSpans(tokens, durationSec);
};

export const wordSpans = async (input: TimingInput): Promise<WordSpan[]> => {
  const key = createHash("sha256")
    .update(readFileSync(input.audioPath))
    .update(input.tokens.map((token) => token.text).join(" "))
    .digest("hex");
  const path = `${TIMINGS_DIR}/${key}.json`;

  if (existsSync(path)) {
    const cached: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (isSpanArray(cached)) return cached;
  }

  const spans = computeSpans(input);
  mkdirSync(TIMINGS_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(spans));
  return spans;
};
