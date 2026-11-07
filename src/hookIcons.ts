export const HOOK_ICONS = [
  "database",
  "lock",
  "shield",
  "git",
  "globe",
  "browser",
  "server",
  "key",
  "bolt",
  "network",
  "bug",
  "code",
  "clock",
  "cloud",
  "layers",
  "terminal",
  "wifi",
  "warning",
  "search",
  "cookie",
  "bank",
  "user",
  "check",
  "cross",
] as const;

export type HookIconName = (typeof HOOK_ICONS)[number];

export const isHookIcon = (value: string | undefined): value is HookIconName => HOOK_ICONS.some((name) => name === value);
