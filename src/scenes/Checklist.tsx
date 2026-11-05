import { useCurrentFrame } from "remotion";
import type { ResolvedScene } from "../episode";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { theme } from "../theme";

type ChecklistProps = { scene: Extract<ResolvedScene, { type: "checklist" }>; context: SceneContext };

const ROW_TOP = 340;
const ROW_STEP = 220;
const INTRO_FRAMES = 12;
const ENTER_FRAMES = 10;
const CHECK_DELAY_FRAMES = 8;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const Checklist = ({ scene, context }: ChecklistProps) => {
  const frame = useCurrentFrame();
  const interval = (context.duration * 0.7 - INTRO_FRAMES) / scene.items.length;
  const startOf = (index: number): number => INTRO_FRAMES + index * interval;
  const closed = scene.items.filter((_, index) => frame >= startOf(index) + CHECK_DELAY_FRAMES).length;

  return (
    <Frame context={context} closed={closed}>
      <div
        style={{
          position: "absolute",
          top: 200,
          left: theme.spacing.page,
          right: theme.spacing.page,
          fontFamily: theme.fonts.heading,
          fontWeight: 900,
          fontSize: 52,
          color: theme.colors.text,
          overflowWrap: "anywhere",
        }}
      >
        {scene.labels.caption}
      </div>
      {scene.items.map((item, index) => {
        const enter = clamp01((frame - startOf(index)) / ENTER_FRAMES);
        const check = clamp01((frame - startOf(index) - CHECK_DELAY_FRAMES) / ENTER_FRAMES);
        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              top: ROW_TOP + index * ROW_STEP,
              left: theme.spacing.page,
              right: theme.spacing.page,
              height: 180,
              boxSizing: "border-box",
              padding: "0 36px",
              display: "flex",
              alignItems: "center",
              gap: 32,
              opacity: enter,
              transform: `translateX(${(1 - enter) * 60}px)`,
              backgroundColor: theme.colors.card,
              border: `3px solid ${check > 0 ? theme.colors.good : theme.colors.cardBorder}`,
              borderRadius: theme.spacing.radius,
            }}
          >
            <svg width={72} height={72} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
              <circle cx={36} cy={36} r={32} fill="none" stroke={theme.colors.good} strokeWidth={5} />
              <path d="M20 37 L32 49 L53 25" fill="none" stroke={theme.colors.good} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - check)} />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: theme.fonts.heading, fontWeight: 700, fontSize: 40, lineHeight: 1.2, color: theme.colors.text, overflowWrap: "anywhere" }}>
                {scene.labels[item.id]}
              </div>
              <div style={{ marginTop: 14, fontFamily: theme.fonts.mono, fontWeight: 700, fontSize: 28, color: theme.colors.accent }}>
                {item.tag}
              </div>
            </div>
          </div>
        );
      })}
    </Frame>
  );
};
