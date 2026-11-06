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
    background: "#05182D",
    backgroundShade: "radial-gradient(ellipse 75% 55% at 50% 45%, rgb(18 70 120 / 0.42) 0%, rgb(5 20 40 / 0.62) 55%, rgb(2 10 22 / 0.82) 100%)",
    card: "rgba(8, 26, 46, 0.84)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    text: "#FFFFFF",
    muted: "#A9B7BF",
    accent: "#2FD5C0",
    keyword: "#8FD3FF",
    string: "#FFB38A",
    good: "#5BE38A",
    bad: "#FF5C6C",
    hot: "#FF7A4D",
    lime: "#C6F135",
    sun: "#FFC247",
  },
  fonts: {
    heading: heading.fontFamily,
    text: text.fontFamily,
    mono: mono.fontFamily,
  },
  spacing: { page: 60, gridCell: 60, radius: 36 },
} as const;
