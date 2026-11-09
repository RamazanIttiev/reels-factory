import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Caveat";
import type { SceneContext } from "../Frame";
import type { TimedWord } from "../timeline";
import type { HookText, OutroText } from "../types";
import type { CustomSceneProps } from "./index";

const hand = loadFont("normal", { weights: ["600", "700"], subsets: ["cyrillic", "latin"] });

type Pt = [number, number];
type DoodleName = "window" | "server" | "cloud" | "disk" | "bolt" | "star" | "spark" | "check" | "cross" | "clock" | "globe";
type Base = { at: number; until?: number; color?: string };
type Shape =
  | { kind: "box"; x: number; y: number; w: number; h: number; fill?: boolean; label?: string; size?: number }
  | { kind: "arrow"; from: Pt; to: Pt; curve?: number; packet?: boolean }
  | { kind: "text"; x: number; y: number; text: string; size?: number; align?: "left" | "center" | "right" }
  | { kind: "marker"; x: number; y: number; w: number; h: number }
  | { kind: "scribble"; x: number; y: number; w: number; style?: "underline" | "wave" | "zigzag" }
  | { kind: "circle"; x: number; y: number; rx: number; ry?: number }
  | { kind: "doodle"; name: DoodleName; x: number; y: number; size?: number };
export type SketchItem = Base & Shape;

const INK = "#2b2622";
const COLORS: Record<string, string> = {
  ink: INK, orange: "#e8590c", teal: "#0c8f82", blue: "#1c6fd1", green: "#2f9e44", red: "#e03131", yellow: "#f2b705", purple: "#7048e8",
};
const colorOf = (name?: string) => COLORS[name ?? "ink"] ?? INK;
const PAPER = { x: 0, y: 0, w: 1080, h: 1920 };

const hash = (a: number, b: number, c: number) => {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const ell = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, k): Pt => {
    const a = a0 + ((a1 - a0) * k) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

const rectPoly = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

const DOODLES: Record<DoodleName, Pt[][]> = {
  window: [
    rectPoly(-1, -0.75, 1, 0.75),
    [[-1, -0.4], [1, -0.4]],
    [[-0.8, -0.58], [-0.76, -0.58]],
    [[-0.6, -0.58], [-0.56, -0.58]],
    [[-0.7, -0.1], [0.3, -0.1]],
    [[-0.7, 0.2], [0.6, 0.2]],
    [[-0.7, 0.5], [0.1, 0.5]],
  ],
  server: [0, 1, 2].flatMap((i): Pt[][] => {
    const y0 = -0.85 + i * 0.6;
    return [rectPoly(-0.9, y0, 0.9, y0 + 0.5), [[-0.7, y0 + 0.25], [0.1, y0 + 0.25]], [[0.55, y0 + 0.25], [0.6, y0 + 0.25]]];
  }),
  cloud: [Array.from({ length: 49 }, (_, k): Pt => {
    const a = (k / 48) * Math.PI * 2;
    const r = 1 + 0.14 * Math.sin(6 * a);
    return [Math.cos(a) * r, Math.sin(a) * r * 0.62];
  })],
  disk: [
    ell(0, -0.55, 0.8, 0.28, 0, Math.PI * 2, 24),
    [[-0.8, -0.55], [-0.8, 0.6]],
    [[0.8, -0.55], [0.8, 0.6]],
    ell(0, 0.6, 0.8, 0.28, 0, Math.PI, 14),
    ell(0, 0.02, 0.8, 0.28, 0, Math.PI, 14),
  ],
  bolt: [[[0.2, -1], [-0.45, 0.1], [0.05, 0.1], [-0.2, 1], [0.5, -0.2], [0, -0.2], [0.2, -1]]],
  star: [Array.from({ length: 11 }, (_, k): Pt => {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 === 0 ? 1 : 0.45;
    return [Math.cos(a) * r, Math.sin(a) * r];
  })],
  spark: [[[0, -1], [0, -0.3]], [[0, 0.3], [0, 1]], [[-1, 0], [-0.3, 0]], [[0.3, 0], [1, 0]], [[-0.65, -0.65], [-0.35, -0.35]], [[0.35, 0.35], [0.65, 0.65]], [[0.65, -0.65], [0.35, -0.35]], [[-0.35, 0.35], [-0.65, 0.65]]],
  check: [[[-0.8, 0], [-0.2, 0.6], [0.8, -0.7]]],
  cross: [[[-0.7, -0.7], [0.7, 0.7]], [[0.7, -0.7], [-0.7, 0.7]]],
  clock: [ell(0, 0, 1, 1, 0, Math.PI * 2, 36), [[0, -1], [0, -0.78]], [[1, 0], [0.78, 0]], [[0, 1], [0, 0.78]], [[-1, 0], [-0.78, 0]]],
  globe: [ell(0, 0, 1, 1, 0, Math.PI * 2, 36), ell(0, 0, 0.4, 1, 0, Math.PI * 2, 24), [[-1, 0], [1, 0]]],
};
const FILLED: ReadonlySet<DoodleName> = new Set(["window", "server", "cloud", "disk", "star", "bolt", "clock", "globe"]);

const bezier = (from: Pt, to: Pt, curve: number): Pt[] => {
  const mid: Pt = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const d = dist(from, to) || 1;
  const ctrl: Pt = [mid[0] - ((to[1] - from[1]) / d) * curve, mid[1] + ((to[0] - from[0]) / d) * curve];
  return Array.from({ length: 16 }, (_, k): Pt => {
    const u = k / 15;
    return [(1 - u) ** 2 * from[0] + 2 * (1 - u) * u * ctrl[0] + u ** 2 * to[0], (1 - u) ** 2 * from[1] + 2 * (1 - u) * u * ctrl[1] + u ** 2 * to[1]];
  });
};

const arrowPolys = (from: Pt, to: Pt, curve: number): Pt[][] => {
  const line = bezier(from, to, curve);
  const prev = line[line.length - 4] ?? from;
  const a = Math.atan2(to[1] - prev[1], to[0] - prev[0]);
  const head = (da: number): Pt => [to[0] - Math.cos(a + da) * 38, to[1] - Math.sin(a + da) * 38];
  return [line, [head(0.5), to, head(-0.5)]];
};

const geometry = (item: SketchItem): Pt[][] => {
  if (item.kind === "box") return [[[item.x, item.y], [item.x + item.w, item.y], [item.x + item.w, item.y + item.h], [item.x, item.y + item.h], [item.x + 3, item.y - 6]]];
  if (item.kind === "arrow") return arrowPolys(item.from, item.to, item.curve ?? 0);
  if (item.kind === "circle") return [ell(item.x, item.y, item.rx, item.ry ?? item.rx, -2.2, Math.PI * 2 - 1.7, 32)];
  if (item.kind === "scribble") {
    const style = item.style ?? "underline";
    if (style === "underline") return [[[item.x, item.y], [item.x + item.w, item.y - 6]], [[item.x + item.w * 0.08, item.y + 12], [item.x + item.w * 0.92, item.y + 4]]];
    const n = Math.max(6, Math.round(item.w / 30));
    return [Array.from({ length: n * 2 + 1 }, (_, k): Pt => {
      const x = item.x + (item.w * k) / (n * 2);
      return [x, item.y + (style === "wave" ? Math.sin(k * 1.5) * 9 : k % 2 === 0 ? -9 : 9)];
    })];
  }
  if (item.kind === "doodle") {
    const half = (item.size ?? 160) / 2;
    return DOODLES[item.name].map((poly) => poly.map((p): Pt => [p[0] * half, p[1] * half]));
  }
  return [];
};

const jitter = (pts: Pt[], id: number, seed: number, amp: number): Pt[] => {
  const dense = pts.flatMap((a, k): Pt[] => {
    const b = pts[k + 1];
    if (!b) return [a];
    const n = Math.max(1, Math.ceil(dist(a, b) / 18));
    return Array.from({ length: n }, (_, m): Pt => [a[0] + ((b[0] - a[0]) * m) / n, a[1] + ((b[1] - a[1]) * m) / n]);
  });
  return dense.map((p, k): Pt => [p[0] + hash(id, k, seed) * amp, p[1] + hash(id + 500, k, seed) * amp]);
};

const toPath = (pts: Pt[]) => pts.map((p, k) => `${k === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
const pathLength = (pts: Pt[]) => pts.reduce((sum, p, k) => (k === 0 ? 0 : sum + dist(pts[k - 1] ?? p, p)), 0);

const pointAt = (polys: Pt[][], p: number): Pt | undefined => {
  const lens = polys.map(pathLength);
  let rest = p * lens.reduce((a, b) => a + b, 0);
  for (const [i, poly] of polys.entries()) {
    const len = lens[i] ?? 0;
    if (rest > len) {
      rest -= len;
      continue;
    }
    for (let k = 1; k < poly.length; k++) {
      const a = poly[k - 1];
      const b = poly[k];
      if (!a || !b) continue;
      const seg = dist(a, b);
      if (rest <= seg) return [a[0] + ((b[0] - a[0]) * rest) / (seg || 1), a[1] + ((b[1] - a[1]) * rest) / (seg || 1)];
      rest -= seg;
    }
  }
  return polys[polys.length - 1]?.at(-1);
};

type StrokeProps = { polys: Pt[][]; id: number; seed: number; p: number; color: string; width: number };
const Strokes = ({ polys, id, seed, p, color, width }: StrokeProps) => {
  const lens = polys.map(pathLength);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let before = 0;
  return (
    <>
      {polys.map((poly, i) => {
        const start = before;
        before += lens[i] ?? 0;
        const local = clamp((p * total - start) / (lens[i] || 1));
        if (local <= 0) return null;
        return [0, 1].map((pass) => {
          const j = jitter(poly, id * 17 + i * 3 + pass * 101, seed, pass === 0 ? 3.4 : 5);
          const len = pathLength(j) + 2;
          return (
            <path
              key={`${i}-${pass}`}
              d={toPath(j)}
              fill="none"
              stroke={color}
              strokeWidth={pass === 0 ? width : width * 0.45}
              strokeOpacity={pass === 0 ? 1 : 0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${len} ${len}`}
              strokeDashoffset={local >= 1 ? 0 : len * (1 - local)}
            />
          );
        });
      })}
    </>
  );
};

const DURATION: Record<SketchItem["kind"], number> = { box: 0.7, arrow: 0.6, text: 0.4, marker: 0.4, scribble: 0.4, circle: 0.55, doodle: 0.55 };
const TEXT_SIZE = 64;

const expand = (items: SketchItem[]): SketchItem[] =>
  items.flatMap((item): SketchItem[] =>
    item.kind === "box" && item.label
      ? [item, { kind: "text", at: item.at + 0.5, until: item.until, color: item.color, x: item.x + item.w / 2, y: item.y + item.h / 2 + (item.size ?? TEXT_SIZE) * 0.3, text: item.label, size: item.size ?? TEXT_SIZE }]
      : [item],
  );

const isItems = (value: unknown): value is SketchItem[] => Array.isArray(value);

const Floaters = ({ t }: { t: number }) => (
  <g stroke={INK} strokeOpacity={0.16} strokeWidth={4} fill="none" strokeLinecap="round">
    {Array.from({ length: 18 }, (_, i) => {
      const x = PAPER.x + 40 + (hash(i, 1, 0) + 0.5) * (PAPER.w - 80);
      const speed = 14 + (hash(i, 2, 0) + 0.5) * 26;
      const y = PAPER.y + PAPER.h - mod((hash(i, 3, 0) + 0.5) * 1200 + t * speed, PAPER.h);
      const s = 14 + (hash(i, 4, 0) + 0.5) * 12;
      if (i % 3 === 0) return <path key={i} d={`M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`} transform={`rotate(${t * 20 + i * 30} ${x} ${y})`} />;
      if (i % 3 === 1) return <circle key={i} cx={x} cy={y} r={s} />;
      return <path key={i} d={`M${x - s} ${y}q${s / 2} ${-s} ${s} 0t${s} 0`} />;
    })}
  </g>
);

type DoodleProps = { name: DoodleName; x: number; y: number; size: number; color: string; p: number; pop: number; t: number; seed: number; id: number };
const Doodle = ({ name, x, y, size, color, p, pop, t, seed, id }: DoodleProps) => {
  const polys = geometry({ kind: "doodle", name, x, y, size, at: 0 });
  const twinkle = name === "bolt" || name === "star" || name === "spark";
  const tilt = twinkle ? Math.sin(t * 5 + y) * 6 : 0;
  const pulse = name === "star" || name === "spark" ? 1 + Math.sin(t * 6 + x) * 0.07 : 1;
  const first = polys[0];
  const fillJ = first && FILLED.has(name) ? jitter(first, id + 900, seed, 4) : undefined;
  return (
    <g transform={`translate(${x} ${y + Math.sin(t * 3 + x * 0.01) * 6}) rotate(${tilt}) scale(${pop * pulse})`}>
      {fillJ && <path d={`${toPath(fillJ)}Z`} transform="translate(9 9)" fill={color} fillOpacity={0.28 * p} />}
      <Strokes polys={polys} id={id} seed={seed} p={p} color={color} width={7} />
      {name === "clock" && p >= 1 && (
        <g stroke={color} strokeWidth={7} strokeLinecap="round" transform={`rotate(${t * 180})`}>
          <path d={`M0 0V${-size * 0.35}`} />
          <path d={`M0 0V${-size * 0.2}`} transform="rotate(90)" />
        </g>
      )}
    </g>
  );
};

const wrap = (text: string, max: number): string =>
  text
    .split(/\s+/)
    .reduce<string[]>((lines, word) => {
      const last = lines[lines.length - 1];
      return last !== undefined && last.length + word.length < max ? [...lines.slice(0, -1), `${last} ${word}`] : [...lines, word];
    }, [])
    .join("\n");

const isDoodle = (name: string): name is DoodleName => name in DOODLES;

const hookItems = (hook: HookText): SketchItem[] => {
  const words = hook.text.split(/\s+/).filter(Boolean);
  const accents = hook.accent.split(/\s+/);
  const isAccent = (word: string) => accents.some((part) => word.includes(part));
  const size = Math.max(...words.map((w) => w.length)) > 8 ? 130 : 165;
  const line = size + 10;
  const top = 760 - ((words.length - 1) * line) / 2;
  const accentAt = words.findIndex(isAccent);
  const accentWord = words[accentAt] ?? "";
  const icon = hook.icon && isDoodle(hook.icon) ? hook.icon : "globe";
  return [
    ...words.map((word, i): SketchItem => ({ kind: "text", at: 0.1 + i * 0.3, x: 540, y: top + i * line, size, text: word, color: isAccent(word) ? "orange" : "ink" })),
    ...(accentAt < 0 ? [] : [{ kind: "scribble", at: 0.3 + words.length * 0.3, x: 540 - accentWord.length * size * 0.24, y: top + accentAt * line + 26, w: accentWord.length * size * 0.48, style: "wave", color: "orange" } satisfies SketchItem]),
    { kind: "doodle", name: icon, at: 0.2, x: 540, y: 1330, size: 240, color: "blue" },
    { kind: "doodle", name: "spark", at: 0.6, x: 250, y: 1240, size: 80, color: "yellow" },
    { kind: "doodle", name: "star", at: 0.9, x: 840, y: 1220, size: 80, color: "orange" },
    { kind: "doodle", name: "bolt", at: 1.2, x: 810, y: 1440, size: 90, color: "yellow" },
    { kind: "doodle", name: "star", at: 1.5, x: 270, y: 1440, size: 60, color: "teal" },
  ];
};

const outroItems = (outro: OutroText, handle: string): SketchItem[] => {
  const text = wrap(outro.text, 16);
  const lines = text.split("\n").length;
  return [
    { kind: "text", at: 0.1, x: 540, y: 700, size: 130, text },
    { kind: "scribble", at: 1.2, x: 230, y: 700 + (lines - 1) * 136 + 36, w: 620, style: "wave", color: "orange" },
    { kind: "text", at: 1.5, x: 540, y: 700 + lines * 136 + 150, size: 90, text: handle, color: "orange" },
    { kind: "doodle", name: "star", at: 0.5, x: 190, y: 480, size: 90, color: "yellow" },
    { kind: "doodle", name: "spark", at: 0.8, x: 890, y: 500, size: 90, color: "teal" },
    { kind: "doodle", name: "bolt", at: 1.8, x: 880, y: 1180, size: 110, color: "yellow" },
    { kind: "doodle", name: "check", at: 2.1, x: 200, y: 1180, size: 110, color: "green" },
  ];
};

export const SketchPage = ({ context, children }: { context: SceneContext; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const seed = Math.floor(frame / 3) % 3;
  const enter = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#f4efe3", transform: `translateY(${(1 - enter) * 40}px)` }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
        {Array.from({ length: 28 }, (_, k) => (
          <line key={k} x1={0} x2={1080} y1={190 + k * 64} y2={190 + k * 64} stroke="#a9bdd8" strokeOpacity={0.45} strokeWidth={2} />
        ))}
        <line x1={80} x2={80} y1={0} y2={1920} stroke="#e07a7a" strokeOpacity={0.5} strokeWidth={3} />
        <Floaters t={t} />
        <Strokes polys={[ell(132, 92, 38, 38, -2, Math.PI * 2 - 1.5, 24)]} id={5001} seed={seed} p={clamp(t / 0.6)} color={COLORS.orange} width={6} />
        <text x={192} y={108} fontFamily={hand.fontFamily} fontWeight={700} fontSize={48} fill={INK}>{context.handle}</text>
        {context.step > 0 && (
          <>
            <rect x={850} y={62} width={130} height={62} rx={12} fill={COLORS.yellow} fillOpacity={0.8} transform="rotate(-3 915 93)" />
            <text x={915} y={108} textAnchor="middle" fontFamily={hand.fontFamily} fontWeight={700} fontSize={50} fill={INK}>{context.step}/{context.total}</text>
          </>
        )}
      </svg>
      <div style={{ position: "absolute", left: 100, top: 60, width: 64, height: 64, borderRadius: 999, backgroundImage: `url(${staticFile(context.avatar)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      {children}
    </AbsoluteFill>
  );
};

export const SketchCaptions = ({ words }: { words: TimedWord[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = words.find((word) => frame >= word.from && frame < word.to);
  if (!active) return null;
  const label = active.text.replace(/[.,!?;:]+$/, "");
  const size = Math.min(150, Math.floor(880 / (label.length * 0.5)));
  const pop = spring({ frame: frame - active.from, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1520, height: 200, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: -26, right: -26, top: size * 0.3, height: size * 0.62, borderRadius: 12, background: active.accent ? COLORS.orange : COLORS.yellow, opacity: 0.6, transform: `rotate(-1.5deg) scaleX(${clamp(pop)})`, transformOrigin: "left" }} />
        <div style={{ position: "relative", fontFamily: hand.fontFamily, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: INK, transform: `scale(${0.85 + 0.15 * pop})` }}>{label}</div>
      </div>
    </div>
  );
};

export const SketchHook = ({ hook, context }: { hook: HookText; context: SceneContext }) => <SketchScene context={context} items={hookItems(hook)} />;
export const SketchOutro = ({ outro, context }: { outro: OutroText; context: SceneContext }) => <SketchScene context={context} items={outroItems(outro, context.handle)} />;

export const Sketch = ({ context, props }: CustomSceneProps) => <SketchScene context={context} items={isItems(props.items) ? props.items : []} />;

const SketchScene = ({ context, items: raw }: { context: SceneContext; items: SketchItem[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const seed = Math.floor(frame / 3) % 3;
  const items = expand(raw);

  const renderItem = (item: SketchItem, id: number) => {
    const color = colorOf(item.color);
    const p = clamp((t - item.at) / DURATION[item.kind]);
    if (t < item.at) return null;
    const out = item.until === undefined ? 1 : clamp(1 - (t - item.until) / 0.25);
    if (out <= 0) return null;
    const polys = geometry(item);
    const tip = p > 0 && p < 1 ? pointAt(polys, p) : undefined;
    const pen = tip && <circle cx={tip[0]} cy={tip[1]} r={10} fill={COLORS.orange} stroke="#fff" strokeWidth={3} />;

    if (item.kind === "text") {
      const lines = item.text.split("\n");
      const size = item.size ?? TEXT_SIZE;
      const total = item.text.length;
      const tp = clamp((t - item.at) / (0.15 + total * 0.035));
      let shown = Math.ceil(total * tp);
      return (
        <g key={id} opacity={out}>
          <text x={item.x} y={item.y} textAnchor={item.align === "left" ? "start" : item.align === "right" ? "end" : "middle"} fontFamily={hand.fontFamily} fontWeight={700} fontSize={size} fill={color}>
            {lines.map((line, li) => {
              const vis = line.slice(0, Math.max(0, shown));
              shown -= line.length + 1;
              return (
                <tspan key={li} x={item.x} dy={li === 0 ? 0 : size * 1.05}>
                  {vis}
                  <tspan fillOpacity={0}>{line.slice(vis.length)}</tspan>
                </tspan>
              );
            })}
          </text>
        </g>
      );
    }

    if (item.kind === "marker") {
      return <rect key={id} x={item.x} y={item.y} width={item.w * clamp(p * 1.1)} height={item.h} rx={10} fill={color === INK ? COLORS.yellow : color} fillOpacity={0.55 * out} transform={`rotate(-1.4 ${item.x} ${item.y})`} />;
    }

    if (item.kind === "doodle") {
      const pop = spring({ frame: frame - item.at * fps, fps, config: { damping: 9, stiffness: 140 } });
      return <Doodle key={id} name={item.name} x={item.x} y={item.y} size={item.size ?? 160} color={color} p={p} pop={pop * out} t={t} seed={seed} id={id} />;
    }

    const width = item.kind === "arrow" ? 9 : item.kind === "scribble" ? 9 : 7;
    const packets =
      item.kind === "arrow" && item.packet && p >= 1
        ? [0, 0.5].map((phase) => pointAt([polys[0] ?? []], mod((t - item.at) / 1.2 + phase, 1)))
        : [];
    const fillBox = item.kind === "box" && item.fill !== false ? polys[0] : undefined;
    return (
      <g key={id} opacity={out}>
        {fillBox && <path d={`${toPath(jitter(fillBox, id + 900, seed, 4))}Z`} transform="translate(9 9)" fill={color} fillOpacity={0.2 * p} />}
        <Strokes polys={polys} id={id} seed={seed} p={p} color={color} width={width} />
        {pen}
        {packets.map((pt, k) => pt && <circle key={k} cx={pt[0]} cy={pt[1]} r={11} fill={COLORS.orange} stroke="#fff" strokeWidth={3} />)}
      </g>
    );
  };

  return (
    <SketchPage context={context}>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">{items.map(renderItem)}</svg>
      </AbsoluteFill>
    </SketchPage>
  );
};
