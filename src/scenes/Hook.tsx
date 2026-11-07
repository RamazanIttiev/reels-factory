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

const WORD_STAGGER = 4;

const Word = ({ text, index, accent }: { text: string; index: number; accent: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = spring({ frame: frame - index * WORD_STAGGER, fps, config: { damping: 9, stiffness: 260 } });
  const glow = 1;
  return (
    <span
      style={{
        display: "inline-block",
        color: accent ? theme.colors.hot : theme.colors.text,
        opacity: index === 0 ? 1 : Math.min(1, land * 3),
        transform: `scale(${1.7 - 0.7 * land}) translateY(${(1 - land) * -30}px)`,
        textShadow: accent ? `0 0 ${20 + 30 * glow}px ${theme.colors.hot}` : "none",
      }}
    >
      {text}
    </span>
  );
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
  const words = hook.text.split(/\s+/).filter(Boolean);
  const accentWords = hook.accent.split(/\s+/);
  const isAccent = (word: string): boolean => accentWords.some((part) => word.includes(part));
  const orbit = hook.orbit ?? [];
  const fontSize = titleFont(hook.text);

  return (
    <Frame context={context}>
      <Sfx name="thud" at={0} />
      <AbsoluteFill style={{ background: "#fff", opacity: interpolate(frame, [0, 6], [0.55, 0], { extrapolateRight: "clamp" }), pointerEvents: "none", zIndex: 5 }} />
      <div
          style={{
            position: "absolute",
            top: 250,
            left: theme.spacing.page,
            right: theme.spacing.page,
            display: "flex",
            zIndex: 2,
            flexWrap: "wrap",
            columnGap: fontSize * 0.28,
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            fontSize,
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          {words.map((word, index) => (
            <Word key={index} text={word} index={index} accent={isAccent(word)} />
          ))}
        </div>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `540px ${CENTER_Y}px` }}>
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
