import { useCurrentFrame } from "remotion";
import type { ResolvedScene } from "../episode";
import { SPREAD } from "../rhythm";
import { Frame, toneColor } from "../Frame";
import type { SceneContext } from "../Frame";
import { Sfx } from "../Sfx";
import { theme } from "../theme";
import type { DiagramEdge, DiagramNode } from "../types";

type DiagramProps = { scene: Extract<ResolvedScene, { type: "diagram" }>; context: SceneContext };

const AREA = { top: 330, width: 880, height: 860 };
const NODE = { width: 250, height: 110 };
const STEP_ANIMATION_FRAMES = 12;
const INTRO_FRAMES = 10;
const ARROW = 20;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const center = (node: DiagramNode) => ({ x: node.x * AREA.width, y: node.y * AREA.height });

const lastStep = (scene: DiagramProps["scene"]): number =>
  Math.max(
    ...scene.nodes.flatMap((node) => [node.step, node.badge?.step ?? 0]),
    ...scene.edges.map((edge) => edge.step),
  );

type EdgeViewProps = { edge: DiagramEdge; from: DiagramNode; to: DiagramNode; progress: number };

const EdgeView = ({ edge, from, to, progress }: EdgeViewProps) => {
  const start = { x: center(from).x + NODE.width / 2, y: center(from).y };
  const end = { x: center(to).x - NODE.width / 2, y: center(to).y };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  const color = edge.tone === "bad" ? theme.colors.bad : theme.colors.muted;
  const lineEnd = length - ARROW;

  return (
    <g opacity={progress > 0 ? 1 : 0}>
      <g transform={`translate(${start.x} ${start.y}) rotate(${angle})`}>
        <line x1={0} y1={0} x2={lineEnd} y2={0} stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={lineEnd} strokeDashoffset={lineEnd * (1 - progress)} />
        <polygon points={`${length},0 ${lineEnd},-12 ${lineEnd},12`} fill={color} opacity={progress > 0.9 ? 1 : 0} />
      </g>
      {edge.label && (
        <text
          x={(start.x + end.x) / 2}
          y={(start.y + end.y) / 2 - 20}
          textAnchor="middle"
          fontFamily={theme.fonts.mono}
          fontWeight={700}
          fontSize={30}
          fill={color}
          opacity={progress}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
};

export const Diagram = ({ scene, context }: DiagramProps) => {
  const frame = useCurrentFrame();
  const stepFrames = (context.duration * SPREAD - INTRO_FRAMES) / lastStep(scene);
  const progressOf = (step: number): number =>
    clamp01((frame - (INTRO_FRAMES + (step - 1) * stepFrames)) / STEP_ANIMATION_FRAMES);
  const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));

  return (
    <Frame context={context}>
      <Sfx name="swish" at={0} />
      {Array.from({ length: lastStep(scene) }, (_, index) => (
        <Sfx key={index} name="click" at={INTRO_FRAMES + index * stepFrames} />
      ))}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: theme.spacing.page,
          right: theme.spacing.page,
          fontFamily: theme.fonts.heading,
          fontWeight: 900,
          fontSize: 44,
          lineHeight: 1.25,
          color: theme.colors.text,
          overflowWrap: "anywhere",
        }}
      >
        {scene.labels.caption}
      </div>
      <div style={{ position: "absolute", top: AREA.top, left: theme.spacing.page, width: AREA.width, height: AREA.height }}>
        <svg width={AREA.width} height={AREA.height} style={{ position: "absolute", inset: 0 }}>
          {scene.edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            return from && to ? (
              <EdgeView key={`${edge.from}-${edge.to}`} edge={edge} from={from} to={to} progress={progressOf(edge.step)} />
            ) : null;
          })}
        </svg>
        {scene.nodes.map((node) => {
          const appear = progressOf(node.step);
          const badge = node.badge;
          const badgeProgress = badge ? progressOf(badge.step) : 0;
          const border = badge && badgeProgress > 0 ? toneColor(badge.tone) : toneColor(node.tone);
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: center(node).x - NODE.width / 2,
                top: center(node).y - NODE.height / 2,
                width: NODE.width,
                height: NODE.height,
                boxSizing: "border-box",
                opacity: appear,
                transform: `scale(${0.8 + 0.2 * appear})`,
                backgroundColor: theme.colors.card,
                border: `4px solid ${border}`,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: theme.fonts.heading,
                fontWeight: 700,
                fontSize: 28,
                color: theme.colors.text,
              }}
            >
              {node.label}
              {badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -22,
                    left: "50%",
                    transform: `translateX(-50%) scale(${badgeProgress})`,
                    backgroundColor: toneColor(badge.tone),
                    color: theme.colors.background,
                    fontFamily: theme.fonts.mono,
                    fontWeight: 700,
                    fontSize: 24,
                    padding: "4px 14px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};
