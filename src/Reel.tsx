import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Captions } from "./Captions";
import type { SceneContext } from "./Frame";
import { Browser } from "./scenes/Browser";
import { Checklist } from "./scenes/Checklist";
import { Code } from "./scenes/Code";
import { Diagram } from "./scenes/Diagram";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import type { ReelProps, Segment } from "./timeline";

const renderContent = ({ content }: Segment, context: SceneContext) => {
  if (content.kind === "hook") return <Hook hook={content.hook} context={context} />;
  if (content.kind === "outro") return <Outro outro={content.outro} context={context} />;
  const { scene } = content;
  if (scene.type === "browser") return <Browser scene={scene} context={context} />;
  if (scene.type === "code") return <Code scene={scene} context={context} />;
  if (scene.type === "diagram") return <Diagram scene={scene} context={context} />;
  return <Checklist scene={scene} context={context} />;
};

export const Reel = (props: ReelProps) => {
  const starts = props.segments.reduce<number[]>(
    (acc, segment, index) => [...acc, index === 0 ? 0 : acc[index - 1] + props.segments[index - 1].duration],
    [],
  );

  return (
    <AbsoluteFill>
      {props.segments.map((segment, index) => {
        const context: SceneContext = {
          item: props.item,
          total: props.total,
          ui: props.ui,
          closed: segment.closed,
          duration: segment.duration,
        };
        return (
          <Sequence key={segment.id} from={starts[index]} durationInFrames={segment.duration}>
            {renderContent(segment, context)}
            <Captions words={segment.words} />
            {segment.audio && <Audio src={staticFile(`audio/${segment.audio}`)} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
