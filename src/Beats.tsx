import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Glyph } from "./HookIcon";
import { Sfx } from "./Sfx";
import { theme } from "./theme";
import type { Beat } from "./types";

const FPS = 30;
const HOLD_FRAMES = 66;
const EXIT_FRAMES = 9;
const TILE = 200;
const ANCHORS = [
  { x: 190, y: 720, tilt: -9 },
  { x: 890, y: 860, tilt: 8 },
  { x: 200, y: 1040, tilt: 7 },
  { x: 880, y: 1160, tilt: -8 },
  { x: 540, y: 700, tilt: 5 },
  { x: 540, y: 1180, tilt: -5 },
];
const COLORS = [theme.colors.accent, theme.colors.hot, theme.colors.lime, theme.colors.sun];

const BeatView = ({ beat, index }: { beat: Beat; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(beat.at * FPS);
  const local = frame - start;
  if (local < 0 || local > HOLD_FRAMES + EXIT_FRAMES) return null;
  const anchor = ANCHORS[index % ANCHORS.length];
  const color = COLORS[index % COLORS.length];
  const enter = spring({ frame: local, fps, config: { damping: 7, stiffness: 220 } });
  const out = interpolate(local, [HOLD_FRAMES, HOLD_FRAMES + EXIT_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = Math.max(0, enter) * (1 - out);
  const rotate = anchor.tilt + (1 - enter) * -40 + out * 30;
  return (
    <div style={{ position: "absolute", left: anchor.x - TILE / 2, top: anchor.y - TILE / 2, width: TILE, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `scale(${scale}) rotate(${rotate}deg)`, opacity: 1 - out }}>
      <div style={{ width: TILE, height: TILE, borderRadius: TILE * 0.28, background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 70px color-mix(in srgb, ${color} 60%, transparent), 0 24px 60px rgba(0,0,0,0.5)` }}>
        <Glyph name={beat.icon} size={TILE * 0.58} color="#06182A" stroke={1.8} />
      </div>
      {beat.text && (
        <div style={{ background: "#fff", color: "#16202C", fontFamily: theme.fonts.heading, fontWeight: 900, fontSize: 30, padding: "8px 20px", borderRadius: 16, whiteSpace: "nowrap", textTransform: "uppercase" }}>{beat.text}</div>
      )}
    </div>
  );
};

export const Beats = ({ beats }: { beats: Beat[] }) => (
  <>
    {beats.map((beat, index) => (
      <Sfx key={`s${index}`} name="tick" at={beat.at * FPS} />
    ))}
    {beats.map((beat, index) => (
      <BeatView key={index} beat={beat} index={index} />
    ))}
  </>
);
