import { Fragment } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Frame } from "../Frame";
import type { SceneContext } from "../Frame";
import { HookIcon } from "../HookIcon";
import { theme } from "../theme";
import type { HookText } from "../types";

import { Sfx } from "../Sfx";

type HookProps = { hook: HookText; context: SceneContext };

export const Hook = ({ hook, context }: HookProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const parts = hook.text.split(hook.accent);

  return (
    <Frame context={context}>
      <Sfx name="thud" at={0} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: theme.spacing.page, gap: 80 }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * scale})`, opacity: scale }}>
          <HookIcon name={hook.icon} size={340} />
        </div>
        <div
          style={{
            transform: `scale(${0.6 + 0.4 * scale})`,
            opacity: scale,
            fontFamily: theme.fonts.heading,
            fontWeight: 900,
            fontSize: 88,
            lineHeight: 1.2,
            textAlign: "center",
            color: theme.colors.text,
            overflowWrap: "anywhere",
          }}
        >
          {parts.map((part, index) => (
            <Fragment key={index}>
              {part}
              {index < parts.length - 1 && <span style={{ color: theme.colors.accent }}>{hook.accent}</span>}
            </Fragment>
          ))}
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
