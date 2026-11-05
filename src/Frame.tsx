import type { ReactNode } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { theme } from "./theme";
import type { Tone, Ui } from "./types";

export type SceneContext = { item: number; total: number; ui: Ui; closed: number; duration: number };

export const toneColor = (tone: Tone | undefined): string =>
  tone === "bad" ? theme.colors.bad : tone === "good" ? theme.colors.good : theme.colors.cardBorder;

const closedLabel = (template: string, closed: number, total: number): string =>
  template.replace("{n}", String(closed)).replace("{m}", String(total));

type FrameProps = { context: SceneContext; closed?: number; children: ReactNode };

export const Frame = ({ context, closed, children }: FrameProps) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.colors.background,
      backgroundImage: `linear-gradient(${theme.colors.backgroundShade}, ${theme.colors.backgroundShade}), url(${staticFile("bg.jpg")})`,
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
            backgroundImage: `url(${staticFile("avatar.jpg")})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `3px solid ${theme.colors.accent}`,
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 30, color: theme.colors.text }}>
          {theme.series.handle}
        </div>
        <div style={{ fontFamily: theme.fonts.mono, fontWeight: 700, fontSize: 30, color: theme.colors.accent }}>
          #{context.item}
        </div>
      </div>
      <div
        style={{
          fontFamily: theme.fonts.text,
          fontWeight: 600,
          fontSize: 30,
          color: theme.colors.background,
          backgroundColor: theme.colors.accent,
          padding: "10px 24px",
          borderRadius: 999,
        }}
      >
        {closedLabel(context.ui.closed, closed ?? context.closed, context.total)}
      </div>
    </div>
    {children}
  </AbsoluteFill>
);
