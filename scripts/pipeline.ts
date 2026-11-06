import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { narrations } from "../src/episode";
import type { Episode } from "../src/episode";
import { buildTimeline, narrationTokens } from "../src/timeline";
import type { AudioInfo, ReelProps } from "../src/timeline";
import { loadEnv } from "./env";
import { loadEpisode } from "./load-episode";
import { providerByName, synthesizeCached } from "./tts";
import { wordSpans } from "./timings";

export type Prepared = { episode: Episode; props: ReelProps; propsPath: string };

const PUBLIC_AUDIO_DIR = "public/audio";
const PROPS_DIR = ".cache/props";

export const prepare = async (slug: string, lang: string): Promise<Prepared> => {
  loadEnv();
  const episode = loadEpisode(slug, lang);
  const provider = providerByName(process.env.TTS_PROVIDER ?? "mock");
  mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });

  const audio: Record<string, AudioInfo> = {};
  for (const { id, text } of narrations(episode)) {
    const result = await synthesizeCached(provider, { text, voiceId: episode.voiceId, lang, voiceSettings: episode.voiceSettings });
    const spans = await wordSpans({
      audioPath: result.path,
      tokens: narrationTokens(text),
      durationSec: result.durationSec,
      providerSpans: result.spans,
    });
    copyFileSync(result.path, `${PUBLIC_AUDIO_DIR}/${result.file}`);
    audio[id] = { file: result.file, durationSec: result.durationSec, spans };
  }

  const props = buildTimeline(episode, audio);
  mkdirSync(PROPS_DIR, { recursive: true });
  const propsPath = `${PROPS_DIR}/${slug}.${lang}.json`;
  writeFileSync(propsPath, JSON.stringify(props));
  return { episode, props, propsPath };
};
