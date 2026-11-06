import { seriesFor } from "./series";
import { isSpoken, stripAudioTags } from "./episode";
import type { Episode, ResolvedScene } from "./episode";
import type { HookText, OutroText } from "./types";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const WORDS_PER_SECOND = 2.5;
export const PLAYBACK_SPEED = 1.15;

const TAIL_FRAMES = 15;
const MIN_SEGMENT_FRAMES = 60;
const LAST_WORD_MIN_FRAMES = 6;

export type WordSpan = { startSec: number; endSec: number };

export type AudioInfo = { file: string; durationSec: number; spans?: WordSpan[] };

export type NarrationToken = { text: string; accent: boolean };

export type TimedWord = { text: string; from: number; to: number; accent: boolean };

export type SegmentContent =
  | { kind: "hook"; hook: HookText }
  | { kind: "scene"; scene: ResolvedScene }
  | { kind: "outro"; outro: OutroText };

export type Segment = {
  id: string;
  duration: number;
  step: number;
  words: TimedWord[];
  audio?: string;
  content: SegmentContent;
};

export type ReelProps = { total: number; handle: string; avatar: string; segments: Segment[] };

const stripPunctuation = (word: string): string => word.replace(/[.,!?;:«»"]+/g, "");

const longestIndex = (words: string[]): number =>
  words.reduce(
    (best, word, index) =>
      stripPunctuation(word).length > stripPunctuation(words[best]).length ? index : best,
    0,
  );

export const narrationTokens = (narration: string): NarrationToken[] =>
  stripAudioTags(narration)
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .flatMap((sentence) => {
      const words = sentence.split(/\s+/).filter(isSpoken);
      const accentIndex = longestIndex(words);
      return words.map((text, index) => ({ text, accent: index === accentIndex }));
    });

export const uniformSpans = (tokens: NarrationToken[], durationSec: number): WordSpan[] => {
  const weights = tokens.map((token) => stripPunctuation(token.text).length + 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.reduce<{ spans: WordSpan[]; cursor: number }>(
    (acc, weight) => {
      const end = acc.cursor + (durationSec * weight) / total;
      return { spans: [...acc.spans, { startSec: acc.cursor, endSec: end }], cursor: end };
    },
    { spans: [], cursor: 0 },
  ).spans;
};

export const alignSpans = (tokens: NarrationToken[], spans: WordSpan[], durationSec: number): WordSpan[] =>
  spans.length === tokens.length ? spans : uniformSpans(tokens, durationSec);

const toWords = (tokens: NarrationToken[], spans: WordSpan[]): TimedWord[] =>
  tokens.map((token, index) => {
    const from = Math.round(spans[index].startSec * FPS);
    const next = spans[index + 1];
    const to = next
      ? Math.round(next.startSec * FPS)
      : Math.max(from + LAST_WORD_MIN_FRAMES, Math.round(spans[index].endSec * FPS));
    return { text: token.text, accent: token.accent, from, to };
  });

const spokenSegment = (
  id: string,
  narration: string,
  audio: AudioInfo | undefined,
  step: number,
  content: SegmentContent,
): Segment => {
  const tokens = narrationTokens(narration);
  const audioSec = audio?.durationSec ?? tokens.length / WORDS_PER_SECOND;
  const audioSpans = audio?.spans ? alignSpans(tokens, audio.spans, audioSec) : uniformSpans(tokens, audioSec);
  const spans = audioSpans.map((span) => ({
    startSec: span.startSec / PLAYBACK_SPEED,
    endSec: span.endSec / PLAYBACK_SPEED,
  }));
  const durationSec = audioSec / PLAYBACK_SPEED;
  return {
    id,
    step,
    content,
    audio: audio?.file,
    words: toWords(tokens, spans),
    duration: Math.max(MIN_SEGMENT_FRAMES, Math.round(durationSec * FPS) + TAIL_FRAMES),
  };
};

export const buildTimeline = (episode: Episode, audio: Record<string, AudioInfo> = {}): ReelProps => ({
  total: episode.scenes.length,
  handle: seriesFor(episode.lang).handle,
  avatar: seriesFor(episode.lang).avatar,
  segments: [
    {
      ...spokenSegment("hook", episode.hook.text, audio.hook, 0, { kind: "hook", hook: episode.hook }),
      words: [],
    },
    ...episode.scenes.map((scene, index) =>
      spokenSegment(scene.id, scene.narration, audio[scene.id], index + 1, {
        kind: "scene",
        scene,
      }),
    ),
    spokenSegment("outro", episode.outro.narration, audio.outro, episode.scenes.length, {
      kind: "outro",
      outro: episode.outro,
    }),
  ],
});

export const totalFrames = (props: ReelProps): number =>
  props.segments.reduce((sum, segment) => sum + segment.duration, 0);
