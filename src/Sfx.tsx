import { Audio, Sequence, staticFile } from "remotion";

export type SfxName = "pop" | "tick" | "chime" | "swish" | "click" | "thud" | "knock";

const VOLUME: Record<SfxName, number> = { pop: 0.22, tick: 0.18, chime: 0.14, swish: 0.12, click: 0.2, thud: 0.22, knock: 0.25 };

type SfxProps = { name: SfxName; at: number };

export const Sfx = ({ name, at }: SfxProps) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={VOLUME[name]} />
  </Sequence>
);
