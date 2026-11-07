import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { autoTimes, FPS, sweepAt } from "./rhythm";
import { theme } from "./theme";
import type { Tone } from "./types";

export type SceneContext = { step: number; total: number; duration: number; handle: string; avatar: string; events?: number[] };

export const toneColor = (tone: Tone | undefined): string =>
  tone === "bad" ? theme.colors.bad : tone === "good" ? theme.colors.good : theme.colors.cardBorder;

type FrameProps = { context: SceneContext; children: ReactNode };

const SWEEP_TOP = 300;
const SWEEP_TRAVEL = 1100;

const Rhythm = ({ context }: { context: SceneContext }) => {
  const frame = useCurrentFrame();
  const progress = sweepAt(frame / FPS, autoTimes(context.events ?? [], context.duration / FPS));
  if (progress === undefined) return null;
  const eased = 1 - Math.pow(1 - progress, 3);
  const y = SWEEP_TOP + eased * SWEEP_TRAVEL;
  const fade = Math.sin(progress * Math.PI);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 4 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 90, height: 180, opacity: 0.16 * fade, background: `linear-gradient(transparent, ${theme.colors.accent}, transparent)` }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: y, height: 4, borderRadius: 4, opacity: 0.55 * fade, background: `linear-gradient(90deg, transparent, ${theme.colors.accent}, transparent)` }} />
    </AbsoluteFill>
  );
};

const SceneEntry = ({ children, flash }: { children: ReactNode; flash: boolean }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - enter) * 40}px) scale(${1.03 - 0.03 * enter})` }}>
      {children}
      {flash && <AbsoluteFill style={{ background: "#fff", opacity: interpolate(frame, [0, 7], [0.3, 0], { extrapolateRight: "clamp" }), pointerEvents: "none" }} />}
    </AbsoluteFill>
  );
};

export const Frame = ({ context, children }: FrameProps) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.colors.background,
      backgroundImage: `${theme.colors.backgroundShade}, url(${staticFile("bg.jpg")})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <SceneEntry flash={context.step > 0}>
    <div
      style={{
        position: "absolute",
        top: 60,
        left: theme.spacing.page,
        right: theme.spacing.page,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundImage: `url(${staticFile(context.avatar)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `3px solid ${theme.colors.sun}`,
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 30, color: theme.colors.text }}>
          {context.handle}
        </div>
      </div>
      {context.step > 0 && (
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontWeight: 700,
            fontSize: 30,
            color: theme.colors.background,
            backgroundColor: theme.colors.sun,
            padding: "10px 24px",
            borderRadius: 999,
          }}
        >
          {context.step}/{context.total}
        </div>
      )}
    </div>
    {children}
    <Rhythm context={context} />
    </SceneEntry>
  </AbsoluteFill>
);
