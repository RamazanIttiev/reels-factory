import { interpolate, useCurrentFrame } from "remotion";
import { Glyph } from "../HookIcon";
import { theme } from "../theme";
import type { MediaLayer } from "../types";

const FPS = 30;
const PANEL = "#0D1B2A";
const LINE = "rgba(255,255,255,0.18)";
const SOFT = "#8FA1B5";
const DOTS = ["#FF5F57", "#FEBC2E", "#28C840"];
const WIDTH = 960;
const NODE = 210;
const COL_X = [170, 480, 790];
const ROW_Y = [130, 430];
const PACKET_FRAMES = 54;

type Kind<K extends MediaLayer["kind"]> = Extract<MediaLayer, { kind: K }>;

const ease = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const since = (frame: number, at: number, frames: number): number => ease((frame - Math.round(at * FPS)) / frames);

const useIn = (at: number): number => {
  const frame = useCurrentFrame();
  return since(frame, at, 12);
};

const Shell = ({ at, children, height }: { at: number; children: React.ReactNode; height: number }) => {
  const enter = useIn(at);
  return (
    <div style={{ width: WIDTH, height, opacity: enter, transform: `translateY(${(1 - enter) * 60}px)`, background: PANEL, border: `3px solid ${LINE}`, borderRadius: 32, boxShadow: "0 30px 90px rgba(0,0,0,0.5)", overflow: "hidden", position: "relative" }}>
      {children}
    </div>
  );
};

export const flowHeight = (layer: Kind<"flow">): number => (layer.nodes.length > 3 ? 590 : 300);

const spot = (index: number, count: number): { x: number; y: number } => {
  const cols = count === 4 ? 2 : Math.min(3, count);
  const offset = count === 4 ? 160 : cols === 2 ? 160 : cols === 1 ? 310 : 0;
  return { x: COL_X[index % cols] + offset, y: ROW_Y[Math.floor(index / cols)] };
};

export const Flow = ({ layer, accent }: { layer: Kind<"flow">; accent: string }) => {
  const frame = useCurrentFrame();
  const spots = layer.nodes.map((_, index) => spot(index, layer.nodes.length));
  const find = (id: string): number => layer.nodes.findIndex((node) => node.id === id);
  return (
    <Shell at={layer.at} height={flowHeight(layer)}>
      <svg width={WIDTH} height={flowHeight(layer)} style={{ position: "absolute", left: 0, top: 0 }}>
        {layer.edges.map((edge, index) => {
          const a = spots[find(edge.from)];
          const b = spots[find(edge.to)];
          if (!a || !b) return null;
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          const ux = (b.x - a.x) / length;
          const uy = (b.y - a.y) / length;
          const x1 = a.x + ux * (NODE / 2 + 6);
          const y1 = a.y + uy * (NODE / 2 + 6);
          const x2 = b.x - ux * (NODE / 2 + 14);
          const y2 = b.y - uy * (NODE / 2 + 14);
          const span = Math.hypot(x2 - x1, y2 - y1);
          const draw = since(frame, edge.at, 14);
          const phase = ((frame - Math.round(edge.at * FPS) - 14) % PACKET_FRAMES) / PACKET_FRAMES;
          const packet = draw >= 1 && frame >= Math.round(edge.at * FPS) + 14;
          return (
            <g key={index} opacity={draw > 0 ? 1 : 0}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={7} strokeLinecap="round" strokeDasharray={span} strokeDashoffset={span * (1 - draw)} />
              <polygon points={`0,0 -26,-14 -26,14`} fill={accent} opacity={draw >= 1 ? 1 : 0} transform={`translate(${x2 + ux * 12} ${y2 + uy * 12}) rotate(${(Math.atan2(uy, ux) * 180) / Math.PI})`} />
              {packet && <circle cx={x1 + (x2 - x1) * phase} cy={y1 + (y2 - y1) * phase} r={11} fill="#fff" opacity={Math.sin(phase * Math.PI)} />}
            </g>
          );
        })}
      </svg>
      {layer.nodes.map((node, index) => {
        const pop = since(frame, node.at, 12);
        const arrived = Math.max(0, ...layer.edges.filter((edge) => edge.to === node.id).map((edge) => 1 - Math.min(1, Math.max(0, (frame - Math.round(edge.at * FPS) - 14) / 18))));
        const where = spots[index];
        const marked = (layer.marks ?? []).filter((mark) => mark.ids.includes(node.id) && frame >= Math.round(mark.at * FPS));
        const hot = node.hot || marked.length > 0;
        const ring = marked.length ? (frame - Math.round(marked[marked.length - 1].at * FPS)) / 20 : 2;
        return (
          <div key={node.id} style={{ position: "absolute", left: where.x - NODE / 2, top: where.y - NODE / 2, width: NODE, height: NODE, opacity: pop, transform: `scale(${0.6 + 0.4 * pop})`, borderRadius: 44, background: "#122338", border: `4px solid ${hot ? accent : LINE}`, boxShadow: `0 0 ${10 + arrived * 60}px ${accent}${hot || arrived > 0 ? "99" : "00"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {ring >= 0 && ring < 1 && <div style={{ position: "absolute", inset: -4, borderRadius: 44, border: `5px solid ${accent}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.45})` }} />}
            <Glyph name={node.icon} size={84} color={hot ? accent : "#fff"} stroke={1.7} />
            <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 28, color: "#fff", textTransform: "uppercase", textAlign: "center", lineHeight: 1.05, padding: "0 8px" }}>{node.label}</div>
          </div>
        );
      })}
    </Shell>
  );
};

const TERM_LINE = 64;
export const terminalHeight = (layer: Kind<"terminal">): number => 92 + layer.lines.length * TERM_LINE + 30;

export const Terminal = ({ layer, accent }: { layer: Kind<"terminal">; accent: string }) => {
  const frame = useCurrentFrame();
  const active = layer.lines.reduce((found, line, index) => (Math.round(line.at * FPS) <= frame ? index : found), -1);
  return (
    <Shell at={layer.at} height={terminalHeight(layer)}>
      <div style={{ height: 62, background: "#1A2B3F", display: "flex", alignItems: "center", gap: 12, padding: "0 26px" }}>
        {DOTS.map((color) => (
          <div key={color} style={{ width: 20, height: 20, borderRadius: 99, background: color }} />
        ))}
        <div style={{ marginLeft: 14, fontFamily: theme.fonts.mono, fontSize: 24, color: SOFT }}>terminal</div>
      </div>
      <div style={{ padding: "22px 36px", fontFamily: theme.fonts.mono, fontWeight: 600, fontSize: 38, lineHeight: `${TERM_LINE}px` }}>
        {layer.lines.map((line, index) => {
          const count = Math.max(0, Math.floor((frame - Math.round(line.at * FPS)) / (line.out ? 1 : 1.4)));
          const shown = line.out ? (frame >= Math.round(line.at * FPS) ? line.text : "") : line.text.slice(0, count);
          const fade = line.out ? since(frame, line.at, 8) : 1;
          return (
            <div key={index} style={{ height: TERM_LINE, whiteSpace: "pre", opacity: fade, color: line.out ? SOFT : "#E8EEF5", transform: line.out ? `translateX(${(1 - fade) * 24}px)` : "none" }}>
              {line.out ? null : <span style={{ color: accent }}>$ </span>}
              {shown}
              {index === active && !line.out && Math.floor(frame / 8) % 2 === 0 && <span style={{ color: accent }}>▍</span>}
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

const METER_ROW = 104;
export const meterHeight = (layer: Kind<"meter">): number => 36 + layer.rows.length * METER_ROW;

export const Meter = ({ layer, accent }: { layer: Kind<"meter">; accent: string }) => {
  const frame = useCurrentFrame();
  const fillOf = (tone?: string): string => (tone === "bad" ? theme.colors.bad : tone === "good" ? "#2FD58A" : accent);
  return (
    <Shell at={layer.at} height={meterHeight(layer)}>
      <div style={{ padding: "18px 36px" }}>
        {layer.rows.map((row, index) => {
          const grow = since(frame, row.at, 22);
          const shown = since(frame, row.at, 10);
          return (
            <div key={index} style={{ height: METER_ROW, display: "flex", alignItems: "center", gap: 24, opacity: shown }}>
              <div style={{ width: 250, fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 30, color: "#fff", textTransform: "uppercase", lineHeight: 1.05 }}>{row.label}</div>
              <div style={{ flex: 1, height: 36, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ width: `${row.fill * grow * 100}%`, height: "100%", borderRadius: 99, background: fillOf(row.tone), boxShadow: `0 0 24px ${fillOf(row.tone)}` }} />
              </div>
              <div style={{ width: 150, textAlign: "right", fontFamily: theme.fonts.mono, fontWeight: 700, fontSize: 32, color: fillOf(row.tone), opacity: interpolate(grow, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{row.value ?? ""}</div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};

const CHECK_ROW = 92;
export const checksHeight = (layer: Kind<"checks">): number => (layer.title ? 96 : 24) + layer.items.length * CHECK_ROW + 20;

export const Checks = ({ layer, accent }: { layer: Kind<"checks">; accent: string }) => {
  const frame = useCurrentFrame();
  return (
    <Shell at={layer.at} height={checksHeight(layer)}>
      {layer.title && <div style={{ height: 96, display: "flex", alignItems: "center", padding: "0 36px", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 36, color: accent, textTransform: "uppercase", borderBottom: `2px solid ${LINE}` }}>{layer.title}</div>}
      <div style={{ padding: "12px 36px 0" }}>
        {layer.items.map((item, index) => {
          const shown = since(frame, item.at, 10);
          const tick = since(frame, item.at + 0.15, 10);
          return (
            <div key={index} style={{ height: CHECK_ROW, display: "flex", alignItems: "center", gap: 24, opacity: shown, transform: `translateX(${(1 - shown) * -50}px)` }}>
              <svg width={52} height={52} viewBox="0 0 52 52">
                <circle cx={26} cy={26} r={22} fill="none" stroke={accent} strokeWidth={4} />
                <path d="M14 27 L23 36 L39 17" fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={50} strokeDashoffset={50 * (1 - tick)} />
              </svg>
              <div style={{ fontFamily: theme.fonts.text, fontWeight: 700, fontSize: 38, color: "#fff" }}>{item.text}</div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
};
