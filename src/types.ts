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
  closed?: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type CodeVisual = {
  id: string;
  type: "code";
  closed?: number;
  file: string;
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
  closed?: number;
  url: string;
  input: string;
};

export type VisualScene = DiagramVisual | CodeVisual | ChecklistVisual | BrowserVisual;

export type Visual = { slug: string; item: number; total: number; scenes: VisualScene[] };

export type HookText = { text: string; accent: string };

export type OutroText = { text: string; narration: string };

export type LangScene = { narration: string; labels?: Record<string, string> };

export type Ui = { closed: string };

export type Lang = {
  lang: string;
  voiceId: string;
  caption: string;
  ui: Ui;
  hook: HookText;
  scenes: Record<string, LangScene>;
  outro: OutroText;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isVisual = (value: unknown): value is Visual =>
  isRecord(value) && typeof value.slug === "string" && Array.isArray(value.scenes);

export const isLang = (value: unknown): value is Lang =>
  isRecord(value) &&
  typeof value.lang === "string" &&
  typeof value.caption === "string" &&
  isRecord(value.ui) &&
  isRecord(value.hook) &&
  isRecord(value.scenes) &&
  isRecord(value.outro);
