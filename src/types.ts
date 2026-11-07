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

export type MediaLayer =
  | { kind: "table"; at: number; until?: number; url: string; columns: string[]; rows: string[][]; hit?: number }
  | { kind: "page"; at: number; until?: number; url: string; headline: string; button: string; click: number }
  | { kind: "code"; at: number; until?: number; code: string; mark?: string }
  | { kind: "card"; at: number; until?: number; icon: string; title: string; value: string; status: string; tone: Tone }
  | { kind: "hub"; at: number; until?: number; icon: string; satellites: { at: number; label: string; icon?: string }[] }
  | { kind: "cards"; at: number; until?: number; items: { at: number; title: string; lines?: string[] }[] }
  | { kind: "rack"; at: number; until?: number; label: string; icon?: string }
  | { kind: "phone"; at: number; until?: number; messages: { at: number; from: "me" | "them"; text: string }[] }
  | { kind: "form"; at: number; until?: number; url: string; title: string; fields: { at: number; label: string; value: string; secret?: boolean }[]; button: string; click: number }
  | { kind: "flow"; at: number; until?: number; nodes: { id: string; at: number; label: string; icon: string; hot?: boolean }[]; edges: { from: string; to: string; at: number }[]; marks?: { at: number; ids: string[] }[] }
  | { kind: "terminal"; at: number; until?: number; lines: { at: number; text: string; out?: boolean }[] }
  | { kind: "meter"; at: number; until?: number; rows: { at: number; label: string; fill: number; value?: string; tone?: Tone }[] }
  | { kind: "checks"; at: number; until?: number; title?: string; items: { at: number; text: string }[] }
  | { kind: "bar"; at: number; until?: number; text: string; icon?: string }
  | { kind: "flyer"; at: number; icon: string };

export type MediaVisual = {
  id: string;
  type: "media";
  title: string;
  accent?: string;
  stat?: { label: string; value: string };
  badge?: { icon: string; text: string };
  layers: MediaLayer[];
};

export type CustomVisual = { id: string; type: "custom"; component: string; props?: Record<string, unknown> };

export type Beat = { at: number; icon: string; text?: string };

export type VisualScene = (DiagramVisual | CodeVisual | ChecklistVisual | BrowserVisual | MediaVisual | CustomVisual) & { beats?: Beat[] };

export type Visual = { slug: string; scenes: VisualScene[] };

export type HookText = { text: string; accent: string; claims: string[]; icon?: string; orbit?: string[] };

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
