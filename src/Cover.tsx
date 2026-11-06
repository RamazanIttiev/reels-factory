import { Fragment } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { HookIcon } from "./HookIcon";
import { theme } from "./theme";
import type { HookText } from "./types";

export type CoverProps = { hook: HookText; handle: string; avatar: string };

export const Cover = ({ hook, handle, avatar }: CoverProps) => {
  const parts = hook.text.split(hook.accent);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        backgroundImage: `linear-gradient(${theme.colors.backgroundShade}, ${theme.colors.backgroundShade}), url(${staticFile("bg.jpg")})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.page,
        gap: 90,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 999,
            backgroundImage: `url(${staticFile(avatar)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `5px solid ${theme.colors.accent}`,
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontFamily: theme.fonts.text, fontWeight: 600, fontSize: 48, color: theme.colors.text }}>
          {handle}
        </div>
      </div>
      <HookIcon name={hook.icon} size={320} />
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontWeight: 900,
          fontSize: 118,
          lineHeight: 1.18,
          textAlign: "center",
          color: theme.colors.text,
          overflowWrap: "anywhere",
        }}
      >
        {parts.map((part, index) => (
          <Fragment key={index}>
            {part}
            {index < parts.length - 1 && <span style={{ color: theme.colors.hot }}>{hook.accent}</span>}
          </Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};
