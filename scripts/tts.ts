import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { WORDS_PER_SECOND, narrationTokens, uniformSpans } from "../src/timeline";
import type { NarrationToken, WordSpan } from "../src/timeline";
import { requireEnv } from "./env";
import { silentWav } from "./wav";

export type VoiceSettings = { stability?: number; style?: number; speed?: number };

export type SynthesisInput = { text: string; voiceId: string; lang: string; voiceSettings?: VoiceSettings };

export type Synthesis = { audio: Buffer; durationSec: number; spans?: WordSpan[] };

export type TtsProvider = {
  name: string;
  cacheId?: string;
  ext: string;
  synthesize: (input: SynthesisInput) => Promise<Synthesis>;
};

export type AudioResult = { file: string; path: string; durationSec: number; spans?: WordSpan[] };

const AUDIO_DIR = ".cache/audio";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

const mock: TtsProvider = {
  name: "mock",
  ext: "wav",
  synthesize: async ({ text }) => {
    const durationSec = narrationTokens(text).length / WORDS_PER_SECOND;
    return { audio: silentWav(durationSec), durationSec };
  },
};

type CharacterAlignment = { characters: string[]; starts: number[]; ends: number[] };

const parseAlignment = (value: unknown): CharacterAlignment | undefined =>
  isRecord(value) &&
  Array.isArray(value.characters) &&
  isNumberArray(value.character_start_times_seconds) &&
  isNumberArray(value.character_end_times_seconds)
    ? {
        characters: value.characters.map(String),
        starts: value.character_start_times_seconds,
        ends: value.character_end_times_seconds,
      }
    : undefined;

const spansFromCharacters = (text: string, tokens: NarrationToken[], alignment: CharacterAlignment): WordSpan[] =>
  tokens.reduce<{ spans: WordSpan[]; cursor: number }>(
    (acc, token) => {
      const start = text.indexOf(token.text, acc.cursor);
      const last = start + token.text.length - 1;
      return {
        spans: [...acc.spans, { startSec: alignment.starts[start] ?? 0, endSec: alignment.ends[last] ?? 0 }],
        cursor: last + 1,
      };
    },
    { spans: [], cursor: 0 },
  ).spans;

const ELEVENLABS_MODEL = "eleven_v4";

export const elevenLabsBody = ({ text, voiceSettings }: SynthesisInput) => ({
  text,
  model_id: ELEVENLABS_MODEL,
  ...(voiceSettings ? { voice_settings: voiceSettings } : {}),
});

const elevenLabs: TtsProvider = {
  name: "elevenlabs",
  cacheId: `elevenlabs-${ELEVENLABS_MODEL}`,
  ext: "mp3",
  synthesize: async (input) => {
    const { text, voiceId } = input;
    const key = requireEnv("ELEVENLABS_API_KEY");
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(elevenLabsBody(input)),
      },
    );
    if (!response.ok) throw new Error(`ElevenLabs HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const body: unknown = await response.json();
    const alignment = isRecord(body) ? parseAlignment(body.alignment) : undefined;
    if (!isRecord(body) || typeof body.audio_base64 !== "string" || !alignment) {
      throw new Error("ElevenLabs: unexpected response shape");
    }
    return {
      audio: Buffer.from(body.audio_base64, "base64"),
      durationSec: Math.max(...alignment.ends),
      spans: spansFromCharacters(text, narrationTokens(text), alignment),
    };
  },
};

const miniMax: TtsProvider = {
  name: "minimax",
  ext: "mp3",
  synthesize: async ({ text, voiceId }) => {
    const key = requireEnv("MINIMAX_API_KEY");
    const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "speech-02-hd",
        text,
        stream: false,
        voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      }),
    });
    if (!response.ok) throw new Error(`MiniMax HTTP ${response.status}`);
    const body: unknown = await response.json();
    const audio = isRecord(body) && isRecord(body.data) ? body.data.audio : undefined;
    const lengthMs = isRecord(body) && isRecord(body.extra_info) ? body.extra_info.audio_length : undefined;
    if (typeof audio !== "string" || typeof lengthMs !== "number") {
      throw new Error("MiniMax: unexpected response shape");
    }
    return { audio: Buffer.from(audio, "hex"), durationSec: lengthMs / 1000 };
  },
};

const providers: TtsProvider[] = [mock, elevenLabs, miniMax];

export const providerByName = (name: string): TtsProvider => {
  const provider = providers.find((candidate) => candidate.name === name);
  if (!provider) throw new Error(`Unknown TTS_PROVIDER "${name}". Use: ${providers.map((p) => p.name).join(", ")}`);
  return provider;
};

export const audioHash = (provider: TtsProvider, { text, voiceId, lang, voiceSettings }: SynthesisInput): string =>
  createHash("sha256")
    .update(
      [text, voiceId, provider.cacheId ?? provider.name, lang, ...(voiceSettings ? [JSON.stringify(voiceSettings)] : [])].join("\u0000"),
    )
    .digest("hex");

const isCachedMeta = (value: unknown): value is { durationSec: number; spans?: WordSpan[] } =>
  isRecord(value) && typeof value.durationSec === "number";

export const synthesizeCached = async (provider: TtsProvider, input: SynthesisInput): Promise<AudioResult> => {
  const hash = audioHash(provider, input);
  const file = `${hash}.${provider.ext}`;
  const path = `${AUDIO_DIR}/${file}`;
  const metaPath = `${AUDIO_DIR}/${hash}.json`;

  if (existsSync(path) && existsSync(metaPath)) {
    const meta: unknown = JSON.parse(readFileSync(metaPath, "utf8"));
    if (isCachedMeta(meta)) return { file, path, durationSec: meta.durationSec, spans: meta.spans };
  }

  const { audio, durationSec, spans } = await provider.synthesize(input);
  mkdirSync(AUDIO_DIR, { recursive: true });
  writeFileSync(path, audio);
  writeFileSync(metaPath, JSON.stringify({ durationSec, spans }));
  return { file, path, durationSec, spans };
};
