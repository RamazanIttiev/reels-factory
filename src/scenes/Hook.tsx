import { Fragment } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { Glyph } from "../HookIcon";
import { Sfx } from "../Sfx";
import { theme } from "../theme";
import type { HookText } from "../types";

type HookProps = { hook: HookText; context: SceneContext };

const CENTER_Y = 1000;
const TILE = 360;
const ORBIT_RADIUS = 380;
const ORBIT_TILE = 140;
const RING_PERIOD = 54;
const TITLE_WIDTH = 880;
const MAX_TITLE_FONT = 100;
const CHAR_WIDTH_EM = 0.92;

const titleFont = (text: string): number => {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  return Math.min(MAX_TITLE_FONT, Math.floor(TITLE_WIDTH / (longest * CHAR_WIDTH_EM)));
};

const Ring = ({ offset }: { offset: number }) => {
  const frame = useCurrentFrame();
  const progress = ((frame + offset) % RING_PERIOD) / RING_PERIOD;
  const size = TILE * (1 + progress * 1.5);
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - size / 2,
        top: CENTER_Y - size / 2,
        width: size,
        height: size,
        borderRadius: size * 0.24,
        border: `5px solid ${theme.colors.accent}`,
        opacity: 0.6 * (1 - progress),
      }}
    />
  );
};

const Orbiter = ({ icon, index, count }: { icon: string; index: number; count: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4 - index * 4, fps, config: { damping: 12, stiffness: 160 } });
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + frame / 70;
  const wobble = Math.sin(frame / 12 + index) * 14;
  const x = 540 + Math.cos(angle) * ORBIT_RADIUS - ORBIT_TILE / 2;
  const y = CENTER_Y + Math.sin(angle) * (ORBIT_RADIUS * 0.8) - ORBIT_TILE / 2 + wobble;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: ORBIT_TILE,
        height: ORBIT_TILE,
        borderRadius: ORBIT_TILE * 0.28,
        background: "rgba(8, 26, 46, 0.92)",
        border: `4px solid ${theme.colors.cardBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${enter})`,
      }}
    >
      <Glyph name={icon} size={ORBIT_TILE * 0.56} color={theme.colors.text} stroke={1.7} />
    </div>
  );
};

export const Hook = ({ hook, context }: HookProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = spring({ frame, fps, config: { damping: 11, stiffness: 170 } });
  const zoom = interpolate(frame, [0, context.duration], [1, 1.07], { extrapolateRight: "clamp" });
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);
  const parts = hook.text.split(hook.accent);
  const orbit = hook.orbit ?? [];
  const fontSize = titleFont(hook.text);

  return (
    <Frame context={context}>
      <Sfx name="thud" at={0} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `540px ${CENTER_Y}px` }}>
        <div
          style={{
            position: "absolute",
            top: 250,
            left: theme.spacing.page,
            right: theme.spacing.page,
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            fontSize,
            lineHeight: 1.1,
            textTransform: "uppercase",
            color: theme.colors.text,
            overflowWrap: "anywhere",
            transform: `translateY(${(1 - Math.min(1, tile * 1.4)) * -50}px)`,
          }}
        >
          {parts.map((part, index) => (
            <Fragment key={index}>
              {part}
              {index < parts.length - 1 && <span style={{ color: theme.colors.hot }}>{hook.accent}</span>}
            </Fragment>
          ))}
        </div>
        <Ring offset={0} />
        <Ring offset={RING_PERIOD / 2} />
        {orbit.map((icon, index) => (
          <Orbiter key={`${icon}-${index}`} icon={icon} index={index} count={orbit.length} />
        ))}
        <div
          style={{
            position: "absolute",
            left: 540 - TILE / 2,
            top: CENTER_Y - TILE / 2,
            width: TILE,
            height: TILE,
            borderRadius: TILE * 0.24,
            background: `linear-gradient(145deg, color-mix(in srgb, ${theme.colors.accent} 88%, #fff), ${theme.colors.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.55 + 0.45 * tile}) rotate(${(1 - tile) * -10}deg)`,
            boxShadow: `0 0 ${50 + 50 * glow}px color-mix(in srgb, ${theme.colors.accent} ${40 + 30 * glow}%, transparent)`,
          }}
        >
          <Glyph name={hook.icon ?? "zap"} size={TILE * 0.56} color="#06182A" stroke={1.5} />
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
