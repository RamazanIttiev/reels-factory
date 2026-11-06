import type { ReactNode } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { theme } from "./theme";
import type { Tone } from "./types";

export type SceneContext = { step: number; total: number; duration: number; handle: string; avatar: string };

export const toneColor = (tone: Tone | undefined): string =>
  tone === "bad" ? theme.colors.bad : tone === "good" ? theme.colors.good : theme.colors.cardBorder;

type FrameProps = { context: SceneContext; children: ReactNode };

export const Frame = ({ context, children }: FrameProps) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.colors.background,
      backgroundImage: `${theme.colors.backgroundShade}, url(${staticFile("bg.jpg")})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
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
  </AbsoluteFill>
);
