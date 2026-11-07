import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedScene } from "../episode";
import { SPREAD } from "../rhythm";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { Sfx } from "../Sfx";
import { theme } from "../theme";
import type { BrowserVisual } from "../types";

type BrowserProps = { scene: BrowserVisual & Extract<ResolvedScene, { type: "browser" }>; context: SceneContext };

const dots = ["#FF5C6C", "#FFC247", "#3DDC97"];

export const Browser = ({ scene, context }: BrowserProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const typedLength = Math.floor(
    interpolate(frame, [20, context.duration * SPREAD], [0, scene.input.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <Frame context={context}>
      <Sfx name="swish" at={0} />
      <div
        style={{
          position: "absolute",
          top: 230,
          left: theme.spacing.page,
          right: theme.spacing.page,
          transform: `translateY(${(1 - enter) * 80}px)`,
          opacity: enter,
          backgroundColor: theme.colors.card,
          border: `3px solid ${theme.colors.cardBorder}`,
          borderRadius: theme.spacing.radius,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 32px", borderBottom: `3px solid ${theme.colors.cardBorder}` }}>
          {dots.map((color) => (
            <div key={color} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: color }} />
          ))}
          <div style={{ flex: 1, marginLeft: 16, padding: "12px 24px", borderRadius: 999, backgroundColor: theme.colors.background, fontFamily: theme.fonts.mono, fontSize: 30, color: theme.colors.muted }}>
            {scene.url}
          </div>
        </div>
        <div style={{ padding: "56px 48px 64px" }}>
          <div style={{ fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 54, color: theme.colors.text, overflowWrap: "anywhere" }}>
            {scene.labels.title}
          </div>
          <div style={{ marginTop: 48, fontFamily: theme.fonts.text, fontSize: 38, color: theme.colors.muted }}>
            {scene.labels.label}
          </div>
          <div
            style={{
              marginTop: 20,
              padding: "28px 32px",
              borderRadius: 24,
              border: `3px solid ${theme.colors.accent}`,
              backgroundColor: theme.colors.background,
              fontFamily: theme.fonts.mono,
              fontWeight: 500,
              fontSize: 46,
              minHeight: 70,
              color: theme.colors.text,
              overflowWrap: "anywhere",
            }}
          >
            {scene.input.slice(0, typedLength)}
            <span style={{ opacity: cursorVisible ? 1 : 0, color: theme.colors.accent }}>|</span>
          </div>
        </div>
      </div>
    </Frame>
  );
};
