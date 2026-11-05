import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadOnest } from "@remotion/google-fonts/Onest";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const subsets = ["cyrillic", "latin"] as const;

const heading = loadUnbounded("normal", { weights: ["700", "900"], subsets: [...subsets] });
const text = loadOnest("normal", { weights: ["400", "600"], subsets: [...subsets] });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: [...subsets] });

export const theme = {
  series: { name: "scalelab.dev", handle: "@scalelab.dev", initials: "SL" },
  colors: {
    background: "#02101A",
    backgroundShade: "rgb(1 7 11 / 0.74)",
    card: "rgba(3, 14, 21, 0.82)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    text: "#FFFFFF",
    muted: "#A9B7BF",
    accent: "#299A8D",
    keyword: "#7FD1C5",
    string: "#C5D0D5",
    good: "#299A8D",
    bad: "#E5484D",
  },
  fonts: {
    heading: heading.fontFamily,
    text: text.fontFamily,
    mono: mono.fontFamily,
  },
  spacing: { page: 60, gridCell: 60, radius: 36 },
} as const;
