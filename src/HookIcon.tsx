import type { ReactNode } from "react";
import { theme } from "./theme";
import { isHookIcon, type HookIconName } from "./hookIcons";
import { brandIcon, isKnownIcon, lucideComponent } from "./icons";

const paths: Record<HookIconName, ReactNode> = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  git: (
    <>
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" />
    </>
  ),
  browser: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 9h20" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="3" width="20" height="8" rx="2" />
      <rect x="2" y="13" width="20" height="8" rx="2" />
      <path d="M6 7h.01M6 17h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </>
  ),
  bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  network: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11l-6 6M12 11l6 6" />
    </>
  ),
  bug: (
    <>
      <path d="M8 2l1.9 1.9M14.1 3.9L16 2M9 7.1V6a3 3 0 0 1 6 0v1.1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M12 20v-9M6 13H2M18 13h4" />
    </>
  ),
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  cloud: <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z" />,
  layers: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  terminal: <path d="M4 17l6-6-6-6M12 19h8" />,
  wifi: <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01" />,
  warning: <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  cookie: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5z" />
      <path d="M9 10h.01M12 15h.01M16 14h.01M8 15h.01" />
    </>
  ),
  bank: (
    <>
      <path d="M3 10l9-6 9 6H3z" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  cross: <path d="M5 5l14 14M19 5L5 19" />,
};

type GlyphProps = { name: string; size: number; color: string; stroke?: number };

export const Glyph = ({ name, size, color, stroke = 1.8 }: GlyphProps) => {
  if (isHookIcon(name))
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    );
  const brand = brandIcon(name);
  if (brand)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d={brand.path} />
      </svg>
    );
  const Component = lucideComponent(name);
  return Component ? <Component size={size} color={color} strokeWidth={stroke} /> : null;
};

export const HookIcon = ({ name, size }: { name?: string; size: number }) => {
  if (!name || !isKnownIcon(name)) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: "rgba(8, 14, 18, 0.72)",
        border: `4px solid ${theme.colors.accent}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Glyph name={name} size={size * 0.58} color={theme.colors.accent} stroke={1.6} />
    </div>
  );
};
