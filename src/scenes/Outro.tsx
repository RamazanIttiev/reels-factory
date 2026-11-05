import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { theme } from "../theme";
import type { OutroText } from "../types";

type OutroProps = { outro: OutroText; context: SceneContext };

export const Outro = ({ outro, context }: OutroProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });

  return (
    <Frame context={context}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: theme.spacing.page, opacity: enter }}>
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            fontSize: 70,
            lineHeight: 1.25,
            textAlign: "center",
            color: theme.colors.text,
            overflowWrap: "anywhere",
          }}
        >
          {outro.text}
        </div>
        <div style={{ marginTop: 48, fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 44, color: theme.colors.accent }}>
          {theme.series.handle}
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
