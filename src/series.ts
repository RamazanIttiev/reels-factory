export type Series = { name: string; handle: string; initials: string; avatar: string };

const SERIES: Record<string, Series> = {
  ru: { name: "scalelab.dev", handle: "@scalelab.dev", initials: "SL", avatar: "avatar.jpg" },
  en: { name: "elvaric.dev", handle: "@elvaric.dev", initials: "EL", avatar: "avatar.en.jpg" },
};

export const seriesFor = (lang: string): Series => SERIES[lang] ?? SERIES.ru;
