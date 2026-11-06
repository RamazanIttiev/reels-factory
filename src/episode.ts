import type { HookText, Lang, OutroText, Visual, VisualScene } from "./types";

type Narrated = { narration: string; labels: Record<string, string>; claims: string[] };

export type ResolvedScene = VisualScene & Narrated;

export type Episode = {
  slug: string;
  lang: string;
  voiceId: string;
  voiceSettings?: Lang["voiceSettings"];
  hook: HookText;
  scenes: ResolvedScene[];
  outro: OutroText;
};

export const resolveEpisode = (visual: Visual, lang: Lang): Episode => ({
  slug: visual.slug,
  lang: lang.lang,
  voiceId: lang.voiceId,
  voiceSettings: lang.voiceSettings,
  hook: lang.hook,
  outro: lang.outro,
  scenes: visual.scenes.map((scene) => {
    const entry = lang.scenes[scene.id];
    if (!entry) throw new Error(`${lang.lang}: missing scene "${scene.id}"`);
    return { ...scene, narration: entry.narration, labels: entry.labels ?? {}, claims: entry.claims };
  }),
});

export const isSpoken = (word: string): boolean => /[\p{L}\p{N}]/u.test(word);

export const stripAudioTags = (text: string): string => text.replace(/\[[^\]]*\]/g, " ");

export const spokenWordCount = (text: string): number =>
  stripAudioTags(text).split(/\s+/).filter(isSpoken).length;

export const narrations = (episode: Episode): { id: string; text: string }[] => [
  { id: "hook", text: episode.hook.text },
  ...episode.scenes.map((scene) => ({ id: scene.id, text: scene.narration })),
  { id: "outro", text: episode.outro.narration },
];
