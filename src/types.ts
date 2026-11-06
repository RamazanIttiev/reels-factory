export type Tone = "neutral" | "good" | "bad";

export type Badge = { text: string; step: number; tone?: Tone };

export type DiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  step: number;
  tone?: Tone;
  badge?: Badge;
};

export type DiagramEdge = { from: string; to: string; step: number; tone?: Tone; label?: string };

export type DiagramVisual = {
  id: string;
  type: "diagram";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type CodeVisual = {
  id: string;
  type: "code";
  file: string;
  provenance?: "quoted" | "schematic";
  code: string;
  resultTone?: Tone;
};

export type ChecklistVisual = {
  id: string;
  type: "checklist";
  items: { id: string; tag: string }[];
};

export type BrowserVisual = {
  id: string;
  type: "browser";
  url: string;
  input: string;
};

export type VisualScene = DiagramVisual | CodeVisual | ChecklistVisual | BrowserVisual;

export type Visual = { slug: string; scenes: VisualScene[] };

export type HookText = { text: string; accent: string; claims: string[] };

export type OutroText = { text: string; narration: string };

export type LangScene = { narration: string; labels?: Record<string, string>; claims: string[] };

export type Lang = {
  lang: string;
  voiceId: string;
  voiceSettings?: { stability?: number; style?: number; speed?: number };
  caption: string;
  hook: HookText;
  scenes: Record<string, LangScene>;
  outro: OutroText;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isClaimList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const isVisual = (value: unknown): value is Visual =>
  isRecord(value) && typeof value.slug === "string" && Array.isArray(value.scenes);

export const isLang = (value: unknown): value is Lang =>
  isRecord(value) &&
  typeof value.lang === "string" &&
  typeof value.caption === "string" &&
  isRecord(value.hook) &&
  isClaimList(value.hook.claims) &&
  isRecord(value.scenes) &&
  Object.values(value.scenes).every((scene) => isRecord(scene) && isClaimList(scene.claims)) &&
  isRecord(value.outro);
