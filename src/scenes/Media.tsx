import { Fragment } from "react";
import type { ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedScene } from "../episode";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { Glyph } from "../HookIcon";
import { Sfx } from "../Sfx";
import { theme } from "../theme";
import type { MediaLayer, Tone } from "../types";
import { Bar, Cards, Form, Hub, Phone, Rack } from "../stage/details";
import { autoTimes, pulseAt } from "../rhythm";
import { Checks, Flow, Meter, Terminal } from "../stage/rich";
import { heightOf, poseAtFrame, WIDTH } from "../stage/layout";

type MediaProps = { scene: Extract<ResolvedScene, { type: "media" }>; context: SceneContext };

const FPS = 30;
const STAGE = { top: 560, height: 710 };
const WINDOW_INK = "#16202c";
const DOTS = ["#FF5F57", "#FEBC2E", "#28C840"];

const toneFill = (tone: Tone): string => (tone === "bad" ? theme.colors.bad : tone === "good" ? "#1F9D55" : "#1F6FEB");

const accentParts = (title: string): { text: string; accent: boolean }[] =>
  title.split("*").map((text, index) => ({ text, accent: index % 2 === 1 }));

const useEnter = (at: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(at * FPS), fps, config: { damping: 14, stiffness: 140 } });
};

const Pulse = ({ children, accent }: { children: ReactNode; accent: string }) => {
  return <span style={{ color: accent, textShadow: `0 0 18px ${accent}` }}>{children}</span>;
};

const Chrome = ({ url }: { url: string }) => (
  <div style={{ background: "#DFE3EA", padding: "14px 28px", display: "flex", alignItems: "center", gap: 14 }}>
    {DOTS.map((color) => (
      <div key={color} style={{ width: 22, height: 22, borderRadius: 999, background: color }} />
    ))}
    <div style={{ flex: 1, marginLeft: 14, background: "#fff", borderRadius: 999, padding: "8px 26px", fontFamily: theme.fonts.mono, fontWeight: 500, fontSize: 28, color: "#445" }}>{url}</div>
  </div>
);

const WindowShell = ({ children, at }: { children: ReactNode; at: number }) => {
  const enter = useEnter(at);
  return (
    <div style={{ flex: "none", opacity: enter, transform: `translateY(${(1 - enter) * 70}px) scale(${0.94 + 0.06 * enter})`, background: "#F4F5F7", borderRadius: 30, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.5)", color: WINDOW_INK }}>
      {children}
    </div>
  );
};

const TableLayer = ({ layer, accent }: { layer: Extract<MediaLayer, { kind: "table" }>; accent: string }) => {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame / 4);
  const cell = { padding: "22px 28px", textAlign: "left" as const, borderBottom: "2px solid #D9DDE4", fontFamily: theme.fonts.mono, fontSize: 30, fontWeight: 500 };
  return (
    <WindowShell at={layer.at}>
      <Chrome url={layer.url} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {layer.columns.map((name) => (
              <th key={name} style={{ ...cell, background: "#ECEFF3", fontWeight: 700 }}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {layer.rows.map((row, index) => (
            <tr key={row.join("|")} style={{ background: index === layer.hit ? `color-mix(in srgb, ${accent} ${20 + pulse * 25}%, #fff)` : "transparent" }}>
              {row.map((value, column) => (
                <td key={column} style={{ ...cell, fontWeight: index === layer.hit ? 700 : 500 }}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </WindowShell>
  );
};

const PageLayer = ({ layer }: { layer: Extract<MediaLayer, { kind: "page" }> }) => {
  const frame = useCurrentFrame();
  const press = Math.round(layer.click * FPS);
  const pressed = frame >= press && frame < press + 6;
  const cursor = interpolate(frame, [press - 25, press], [140, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <WindowShell at={layer.at}>
      <Chrome url={layer.url} />
      <div style={{ background: "linear-gradient(160deg,#6A1FD0,#E0197D)", padding: "30px 40px 36px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 52, lineHeight: 1.1, overflowWrap: "anywhere" }}>{layer.headline}</div>
        <div style={{ position: "relative", display: "inline-block", marginTop: 26 }}>
          <div style={{ background: "#FFE14A", color: "#2A0A40", borderRadius: 24, padding: "16px 56px", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 38, transform: pressed ? "scale(0.92)" : "none" }}>{layer.button}</div>
          <svg width={84} height={84} viewBox="0 0 24 24" fill="#fff" stroke="#000" strokeWidth={1.2} style={{ position: "absolute", right: -30, bottom: -50, transform: `translate(${cursor}px, ${cursor}px)` }}>
            <path d="M5 3l14 8-6 2-3 6z" />
          </svg>
        </div>
      </div>
    </WindowShell>
  );
};

const CodeLayer = ({ layer, accent }: { layer: Extract<MediaLayer, { kind: "code" }>; accent: string }) => {
  const enter = useEnter(layer.at);
  const pieces = layer.mark ? layer.code.split(layer.mark) : [layer.code];
  return (
    <div style={{ opacity: enter, transform: `translateX(${(1 - enter) * -120}px)`, background: "rgba(13,27,42,0.94)", border: "3px solid rgba(255,255,255,0.22)", borderRadius: 30, padding: "40px 44px", fontFamily: theme.fonts.mono, fontWeight: 700, fontSize: 40, lineHeight: 1.7, color: theme.colors.keyword, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {pieces.map((piece, index) => (
        <Fragment key={index}>
          {piece}
          {index < pieces.length - 1 && <Pulse accent={accent}>{layer.mark}</Pulse>}
        </Fragment>
      ))}
    </div>
  );
};

const CardLayer = ({ layer }: { layer: Extract<MediaLayer, { kind: "card" }> }) => {
  const enter = useEnter(layer.at);
  return (
    <div style={{ flex: "none", opacity: enter, transform: `scale(${0.8 + 0.2 * enter})`, display: "flex", alignItems: "center", gap: 28, background: "#fff", color: WINDOW_INK, borderRadius: 36, padding: "22px 32px", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: toneFill(layer.tone), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Glyph name={layer.icon} size={64} color="#fff" stroke={2} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 30, color: "#667" }}>{layer.title}</div>
        <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 44, overflowWrap: "anywhere" }}>{layer.value}</div>
      </div>
      <div style={{ background: toneFill(layer.tone), color: "#fff", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 28, padding: "14px 24px", borderRadius: 18, flex: "none" }}>{layer.status}</div>
    </div>
  );
};

const FlyerLayer = ({ layer }: { layer: Extract<MediaLayer, { kind: "flyer" }> }) => {
  const frame = useCurrentFrame();
  const start = Math.round(layer.at * FPS);
  const progress = interpolate(frame, [start, start + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bounce = interpolate(progress, [0, 1], [0, 1], { easing: (t) => t * t });
  return (
    <div style={{ position: "absolute", left: "50%", marginLeft: -60, top: bounce * (STAGE.height - 170) - 40, width: 120, height: 120, borderRadius: 999, background: "#D79A54", display: "flex", alignItems: "center", justifyContent: "center", opacity: progress > 0 && progress < 1 ? 1 : 0, boxShadow: "0 0 60px rgba(255,122,77,0.8)" }}>
      <Glyph name={layer.icon} size={72} color="#3A2208" stroke={1.8} />
    </div>
  );
};

const Leave = ({ until, children }: { until?: number; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const out = until === undefined ? 0 : interpolate(frame, [Math.round(until * FPS), Math.round(until * FPS) + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: 1 - out, transform: `scale(${1 - 0.25 * out}) translateX(${out * 120}px)` }}>{children}</div>;
};

const renderLayer = (layer: MediaLayer, accent: string, index: number) => {
  if (layer.kind === "table") return <TableLayer key={index} layer={layer} accent={accent} />;
  if (layer.kind === "page") return <PageLayer key={index} layer={layer} />;
  if (layer.kind === "code") return <CodeLayer key={index} layer={layer} accent={accent} />;
  if (layer.kind === "card") return <CardLayer key={index} layer={layer} />;
  if (layer.kind === "hub") return <Hub key={index} layer={layer} accent={accent} />;
  if (layer.kind === "cards") return <Cards key={index} layer={layer} />;
  if (layer.kind === "rack") return <Rack key={index} layer={layer} accent={accent} />;
  if (layer.kind === "phone") return <Phone key={index} layer={layer} accent={accent} />;
  if (layer.kind === "form") return <Form key={index} layer={layer} accent={accent} />;
  if (layer.kind === "flow") return <Flow key={index} layer={layer} accent={accent} />;
  if (layer.kind === "terminal") return <Terminal key={index} layer={layer} accent={accent} />;
  if (layer.kind === "meter") return <Meter key={index} layer={layer} accent={accent} />;
  if (layer.kind === "checks") return <Checks key={index} layer={layer} accent={accent} />;
  if (layer.kind === "bar") return <Bar key={index} layer={layer} accent={accent} />;
  return <FlyerLayer key={index} layer={layer} />;
};

export const Media = ({ scene, context }: MediaProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.accent ?? theme.colors.hot;
  const rule = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const badge = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 130 } });
  const flowEntries = scene.layers.map((layer, index) => ({ layer, index })).filter(({ layer }) => layer.kind !== "flyer");
  const pose = poseAtFrame(scene.layers, frame, STAGE.height);
  const flyers = scene.layers.filter((layer) => layer.kind === "flyer");
  const reaction = pulseAt(frame / FPS, autoTimes(context.events ?? [], context.duration / FPS));
  const newest = flowEntries.filter(({ layer }) => layer.at * FPS <= frame).reduce<number>((best, { layer, index }) => (best < 0 || layer.at >= (scene.layers[best]?.kind === "flyer" ? -1 : (scene.layers[best] as { at: number }).at) ? index : best), -1);

  return (
    <Frame context={context}>
      <Sfx name="swish" at={0} />
      {scene.layers.map((layer, index) => (
        <Sfx key={index} name={layer.kind === "flyer" ? "swish" : "tick"} at={layer.at * FPS} />
      ))}
      {scene.layers.flatMap((layer, index) => (layer.kind === "page" ? [<Sfx key={`click${index}`} name="click" at={layer.click * FPS} />] : []))}
      {scene.stat && (
        <div style={{ position: "absolute", top: 140, right: theme.spacing.page, textAlign: "right", fontFamily: theme.fonts.mono, fontWeight: 700 }}>
          <div style={{ fontSize: 26, color: theme.colors.muted, fontWeight: 600 }}>{scene.stat.label}</div>
          <div style={{ fontSize: 44, color: accent }}>{scene.stat.value}</div>
        </div>
      )}
      <div style={{ position: "absolute", top: 252, left: theme.spacing.page, width: (1080 - theme.spacing.page * 2) * rule, height: 10, borderRadius: 10, background: accent }} />
      <div style={{ position: "absolute", top: 285, left: theme.spacing.page, right: theme.spacing.page, fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 72, lineHeight: 1.1, textTransform: "uppercase", color: theme.colors.text, overflowWrap: "anywhere" }}>
        {accentParts(scene.title).map((part, index) => (
          <span key={index} style={{ color: part.accent ? accent : theme.colors.text }}>{part.text}</span>
        ))}
      </div>
      <div style={{ position: "absolute", top: STAGE.top, left: (1080 - WIDTH) / 2, width: WIDTH, height: STAGE.height }}>
        {pose && (
          <div style={{ position: "absolute", left: 0, top: Math.round(pose.top), width: WIDTH, transform: `translateZ(0) scale(${Math.round(pose.scale * 1000) / 1000})`, transformOrigin: "top center", willChange: "transform" }}>
            {flowEntries.map(({ layer, index }) =>
              pose.ys[index] === undefined ? null : (
                <div key={index} style={{ position: "absolute", left: 0, top: Math.round(pose.ys[index]), width: WIDTH, height: heightOf(layer), borderRadius: 30, boxShadow: index === newest && reaction > 0 ? `0 0 ${70 * reaction}px ${accent}` : "none" }}>
                  <Leave until={"until" in layer ? layer.until : undefined}>{renderLayer(layer, accent, index)}</Leave>
                </div>
              ),
            )}
          </div>
        )}
        {flyers.map((layer, index) => renderLayer(layer, accent, 100 + index))}
      </div>
      {scene.badge && (
        <div style={{ position: "absolute", left: theme.spacing.page, top: 1285, display: "flex", alignItems: "center", gap: 28, transform: `scale(${0.7 + 0.3 * badge})`, opacity: badge, transformOrigin: "left center" }}>
          <div style={{ width: 116, height: 116, borderRadius: 32, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Glyph name={scene.badge.icon} size={72} color="#06182A" stroke={2} />
          </div>
          <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 70, textTransform: "uppercase", color: theme.colors.text, textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>{scene.badge.text}</div>
        </div>
      )}
    </Frame>
  );
};
