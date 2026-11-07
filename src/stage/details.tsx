import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Glyph } from "../HookIcon";
import { theme } from "../theme";
import type { MediaLayer } from "../types";

const FPS = 30;
const INK = "#16202C";
const PANEL = "#0D1B2A";
const PANEL_LINE = "rgba(255,255,255,0.18)";
const SOFT = "#8FA1B5";
const DOTS = ["#FF5F57", "#FEBC2E", "#28C840"];

type Kind<K extends MediaLayer["kind"]> = Extract<MediaLayer, { kind: K }>;

const useSpring = (at: number, damping = 13, stiffness = 150): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return Math.max(0, spring({ frame: frame - Math.round(at * FPS), fps, config: { damping, stiffness } }));
};

const typed = (value: string, frame: number, at: number, secret?: boolean): string => {
  const count = Math.max(0, Math.min(value.length, Math.floor((frame - Math.round(at * FPS)) / 2)));
  return secret ? "•".repeat(count) : value.slice(0, count);
};

const Cursor = ({ x, y, size = 80 }: { x: number; y: number; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" stroke="#000" strokeWidth={1.2} style={{ position: "absolute", left: x, top: y }}>
    <path d="M5 3l14 8-6 2-3 6z" />
  </svg>
);

export const Hub = ({ layer, accent }: { layer: Kind<"hub">; accent: string }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(layer.at, 10, 150);
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);
  const centerX = 480;
  const centerY = 280;
  const spots = [-90, -30, 30, 90, 150, 210].map((deg) => ({
    x: centerX + Math.cos((deg * Math.PI) / 180) * 360,
    y: centerY + Math.sin((deg * Math.PI) / 180) * 235,
  }));
  return (
    <div style={{ position: "relative", width: 960, height: 560 }}>
      <svg width={960} height={560} style={{ position: "absolute", inset: 0 }}>
        {layer.satellites.map((satellite, index) => {
          const spot = spots[index % spots.length];
          const draw = Math.min(1, useSpring(satellite.at, 20, 120));
          return <line key={index} x1={centerX} y1={centerY} x2={centerX + (spot.x - centerX) * draw} y2={centerY + (spot.y - centerY) * draw} stroke={accent} strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: "absolute", left: centerX - 130, top: centerY - 130, width: 260, height: 260, borderRadius: 64, background: "#0A1420", border: `4px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${enter})`, boxShadow: `0 0 ${50 + 50 * glow}px color-mix(in srgb, ${accent} ${35 + 25 * glow}%, transparent)` }}>
        <Glyph name={layer.icon} size={150} color={accent} stroke={1.6} />
      </div>
      {layer.satellites.map((satellite, index) => {
        const spot = spots[index % spots.length];
        const pop = useSpring(satellite.at, 9, 220);
        return (
          <div key={index} style={{ position: "absolute", left: spot.x, top: spot.y, transform: `translate(-50%, -50%) scale(${pop})`, display: "flex", alignItems: "center", gap: 14, background: "rgba(10,20,32,0.95)", border: `3px solid ${PANEL_LINE}`, borderRadius: 26, padding: "16px 28px", color: "#fff", fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 40, whiteSpace: "nowrap" }}>
            {satellite.icon && <Glyph name={satellite.icon} size={44} color={accent} stroke={2} />}
            {satellite.label}
          </div>
        );
      })}
    </div>
  );
};

export const Cards = ({ layer }: { layer: Kind<"cards"> }) => (
  <div style={{ display: "flex", gap: 20, width: 960, height: 220 }}>
    {layer.items.map((item, index) => {
      const pop = useSpring(item.at, 11, 180);
      return (
        <div key={index} style={{ flex: 1, minWidth: 0, background: "#fff", color: INK, borderRadius: 24, padding: "20px 22px", transform: `scale(${pop}) translateY(${(1 - pop) * 40}px)`, boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
          <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 30, marginBottom: 14, overflowWrap: "anywhere" }}>{item.title}</div>
          {(item.lines ?? []).map((line, lineIndex) => (
            <div key={lineIndex} style={{ fontFamily: theme.fonts.mono, fontWeight: 500, fontSize: 25, color: "#556", background: "#EEF1F5", borderRadius: 8, padding: "4px 10px", marginTop: 8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line}</div>
          ))}
        </div>
      );
    })}
  </div>
);

export const Rack = ({ layer, accent }: { layer: Kind<"rack">; accent: string }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(layer.at, 14, 140);
  return (
    <div style={{ width: 960, height: 230, borderRadius: 30, background: "linear-gradient(180deg,#1B2A3C,#0F1A28)", border: `3px solid ${PANEL_LINE}`, display: "flex", alignItems: "center", padding: "0 40px", gap: 36, transform: `translateY(${(1 - enter) * 80}px)`, opacity: enter, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#fff", fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 38, minWidth: 270 }}>
        {layer.icon && <Glyph name={layer.icon} size={64} color="#fff" stroke={1.8} />}
        {layer.label}
      </div>
      <div style={{ display: "flex", gap: 14, flex: 1 }}>
        {[0, 1, 2, 3, 4].map((slot) => (
          <div key={slot} style={{ flex: 1, height: 130, borderRadius: 12, background: "#09121D", border: "2px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: 99, background: (frame + slot * 7) % 24 < 12 ? accent : "#27384A" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18 }}>
        {[1, -1].map((direction) => (
          <div key={direction} style={{ transform: `rotate(${frame * 14 * direction}deg)` }}>
            <Glyph name="fan" size={84} color="#B8C6D6" stroke={1.6} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Phone = ({ layer, accent }: { layer: Kind<"phone">; accent: string }) => {
  const enter = useSpring(layer.at, 13, 150);
  return (
    <div style={{ width: 960, height: 520, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 290, height: 520, borderRadius: 54, background: "#05080D", border: "6px solid #2C3A4C", padding: 12, transform: `translateY(${(1 - enter) * 120}px)`, opacity: enter, boxShadow: "0 30px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column" }}>
        <div style={{ margin: "6px auto 14px", width: 90, height: 22, borderRadius: 99, background: "#000", border: "1px solid #1B2430" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: "0 8px", justifyContent: "flex-end", paddingBottom: 18 }}>
          {layer.messages.map((message, index) => {
            const pop = useSpring(message.at, 10, 220);
            const mine = message.from === "me";
            return (
              <div key={index} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", background: mine ? accent : "#1C2735", color: mine ? "#06182A" : "#E8EEF5", fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 24, padding: "10px 16px", borderRadius: 20, transform: `scale(${pop})`, transformOrigin: mine ? "right bottom" : "left bottom" }}>
                {message.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Form = ({ layer, accent }: { layer: Kind<"form">; accent: string }) => {
  const frame = useCurrentFrame();
  const enter = useSpring(layer.at, 14, 140);
  const click = Math.round(layer.click * FPS);
  const lastAt = Math.max(...layer.fields.map((field) => field.at));
  const active = layer.fields.reduce((found, field, index) => (frame >= Math.round(field.at * FPS) ? index : found), -1);
  const aim = interpolate(frame, [click - 28, click], [220, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pressed = frame >= click && frame < click + 6;
  return (
    <div style={{ width: 960, height: 82 + 110 + layer.fields.length * 88 + 110, background: PANEL, border: `3px solid ${PANEL_LINE}`, borderRadius: 30, overflow: "hidden", position: "relative", transform: `translateY(${(1 - enter) * 80}px)`, opacity: enter, boxShadow: "0 40px 100px rgba(0,0,0,0.55)" }}>
      <div style={{ height: 82, background: "#14263A", display: "flex", alignItems: "center", gap: 14, padding: "0 28px" }}>
        {DOTS.map((color) => (
          <div key={color} style={{ width: 22, height: 22, borderRadius: 99, background: color }} />
        ))}
        <div style={{ marginLeft: 14, fontFamily: theme.fonts.mono, fontWeight: 500, fontSize: 26, color: SOFT }}>{layer.url}</div>
      </div>
      <div style={{ padding: "26px 36px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#fff", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 34, marginBottom: 14 }}>
          <Glyph name="plus" size={36} color={accent} stroke={2.4} />
          {layer.title}
        </div>
        {layer.fields.map((field, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 20, height: 88 }}>
            <div style={{ width: 250, fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 26, color: SOFT }}>{field.label}</div>
            <div style={{ flex: 1, height: 58, borderRadius: 14, border: `3px solid ${active === index && frame < click ? accent : PANEL_LINE}`, background: "#0A1420", display: "flex", alignItems: "center", padding: "0 20px", fontFamily: theme.fonts.mono, fontWeight: 500, fontSize: 28, color: "#E8EEF5", opacity: frame >= Math.round(field.at * FPS) - 6 ? 1 : 0.4 }}>
              {typed(field.value, frame, field.at, field.secret)}
              {active === index && frame < click && Math.floor(frame / 8) % 2 === 0 && <span style={{ color: accent }}>|</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 44, bottom: 26 }}>
        <div style={{ background: accent, color: "#06182A", fontFamily: theme.fonts.text, fontWeight: 700, fontSize: 30, padding: "16px 36px", borderRadius: 16, opacity: frame >= Math.round(lastAt * FPS) ? 1 : 0.35, transform: pressed ? "scale(0.92)" : "none" }}>{layer.button}</div>
      </div>
      <Cursor x={820 + aim} y={290 + layer.fields.length * 88 + aim} />
    </div>
  );
};

export const Bar = ({ layer, accent }: { layer: Kind<"bar">; accent: string }) => {
  const enter = useSpring(layer.at, 14, 170);
  return (
    <div style={{ width: 960, height: 88, borderRadius: 22, background: accent, color: "#06182A", display: "flex", alignItems: "center", gap: 16, padding: "0 30px", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 38, transform: `scaleX(${enter})`, transformOrigin: "left center", boxShadow: `0 0 50px color-mix(in srgb, ${accent} 45%, transparent)` }}>
      {layer.icon && <Glyph name={layer.icon} size={46} color="#06182A" stroke={2.2} />}
      {layer.text}
    </div>
  );
};

