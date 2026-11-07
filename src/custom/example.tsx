import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Frame } from "../Frame";
import { Glyph } from "../HookIcon";
import { theme } from "../theme";
import type { CustomSceneProps } from "./index";

export const Example = ({ context }: CustomSceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  return (
    <Frame context={context}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 600, display: "flex", justifyContent: "center", transform: `scale(${pop})` }}>
        <Glyph name="sparkles" size={400} color={theme.colors.accent} stroke={1.4} />
      </div>
    </Frame>
  );
};
