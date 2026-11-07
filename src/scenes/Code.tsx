import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedScene } from "../episode";
import { SPREAD } from "../rhythm";
import { Frame, toneColor } from "../Frame";
import type { SceneContext } from "../Frame";
import { Sfx } from "../Sfx";
import { theme } from "../theme";

type CodeProps = { scene: Extract<ResolvedScene, { type: "code" }>; context: SceneContext };

type Token = { text: string; color: string };

const tokenPattern =
  /(\/\/.*$)|("[^"]*"|'[^']*'|`[^`]*`)|\b(async|function|const|let|return|await|if|new|throw)\b|\b(\d+)\b/g;

const colors = [theme.colors.muted, theme.colors.string, theme.colors.keyword, theme.colors.lime];

const tokenize = (line: string): Token[] => {
  const matches = [...line.matchAll(tokenPattern)];
  const { tokens, cursor } = matches.reduce<{ tokens: Token[]; cursor: number }>(
    (acc, match) => {
      const start = match.index ?? 0;
      const group = match.findIndex((value, index) => index > 0 && value !== undefined) - 1;
      const plain = { text: line.slice(acc.cursor, start), color: theme.colors.text };
      return {
        tokens: [...acc.tokens, plain, { text: match[0], color: colors[group] }],
        cursor: start + match[0].length,
      };
    },
    { tokens: [], cursor: 0 },
  );
  return [...tokens, { text: line.slice(cursor), color: theme.colors.text }];
};

export const Code = ({ scene, context }: CodeProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = scene.code.split("\n");
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const visibleLines = Math.floor(
    interpolate(frame, [10, context.duration * SPREAD * 0.8], [0, lines.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const resultEnter = spring({ frame: frame - Math.floor(context.duration * SPREAD), fps, config: { damping: 14 } });
  const tone = toneColor(scene.resultTone);

  return (
    <Frame context={context}>
      <Sfx name="swish" at={0} />
      <Sfx name="knock" at={context.duration * SPREAD} />
      <div
        style={{
          position: "absolute",
          top: 190,
          left: theme.spacing.page,
          right: theme.spacing.page,
          transform: `translateY(${(1 - enter) * 80}px)`,
          opacity: enter,
          backgroundColor: theme.colors.card,
          border: `3px solid ${theme.colors.cardBorder}`,
          borderRadius: theme.spacing.radius,
          padding: "32px 44px 44px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div style={{ fontFamily: theme.fonts.mono, fontWeight: 700, fontSize: 30, color: theme.colors.lime }}>
            {scene.file}
          </div>
          <div style={{ fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 32, color: theme.colors.muted, textAlign: "right" }}>
            {scene.labels.caption}
          </div>
        </div>
        <div style={{ marginTop: 28, fontFamily: theme.fonts.mono, fontWeight: 500, fontSize: 36, lineHeight: 1.5, whiteSpace: "pre" }}>
          {lines.map((line, index) => (
            <div key={index} style={{ opacity: index < visibleLines ? 1 : 0, minHeight: "1.5em" }}>
              {tokenize(line).map((token, tokenIndex) => (
                <span key={tokenIndex} style={{ color: token.color }}>
                  {token.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {scene.labels.result && (
        <div
          style={{
            position: "absolute",
            top: 1110,
            left: theme.spacing.page,
            right: theme.spacing.page,
            transform: `translateY(${(1 - resultEnter) * 60}px)`,
            opacity: resultEnter,
            backgroundColor: theme.colors.card,
            border: `4px solid ${tone}`,
            borderRadius: theme.spacing.radius,
            padding: "28px 44px",
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            fontSize: 40,
            lineHeight: 1.25,
            color: tone,
            overflowWrap: "anywhere",
          }}
        >
          {scene.labels.result}
        </div>
      )}
    </Frame>
  );
};
