import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Beats } from "./Beats";
import { Captions } from "./Captions";
import type { SceneContext } from "./Frame";
import { Browser } from "./scenes/Browser";
import { Checklist } from "./scenes/Checklist";
import { Code } from "./scenes/Code";
import { Diagram } from "./scenes/Diagram";
import { Media } from "./scenes/Media";
import { customScenes } from "./custom";
import { SketchCaptions, SketchHook, SketchOutro } from "./custom/sketch";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { FPS, hookEvents, sceneEvents } from "./rhythm";
import { PLAYBACK_SPEED } from "./timeline";
import type { ReelProps, Segment } from "./timeline";

const renderContent = ({ content }: Segment, context: SceneContext, sketchy: boolean) => {
  if (content.kind === "hook") return sketchy ? <SketchHook hook={content.hook} context={context} /> : <Hook hook={content.hook} context={context} />;
  if (content.kind === "outro") return sketchy ? <SketchOutro outro={content.outro} context={context} /> : <Outro outro={content.outro} context={context} />;
  const { scene } = content;
  if (scene.type === "browser") return <Browser scene={scene} context={context} />;
  if (scene.type === "code") return <Code scene={scene} context={context} />;
  if (scene.type === "custom") {
    const Custom = customScenes[scene.component];
    if (!Custom) throw new Error(`custom scene "${scene.component}" is not registered in src/custom/index.ts`);
    return <Custom context={context} props={scene.props ?? {}} />;
  }
  if (scene.type === "media") return <Media scene={scene} context={context} />;
  if (scene.type === "diagram") return <Diagram scene={scene} context={context} />;
  return <Checklist scene={scene} context={context} />;
};

const eventsOf = ({ content, duration }: Segment): number[] => {
  const seconds = duration / FPS;
  if (content.kind === "hook") return hookEvents(content.hook.text.split(/\s+/).filter(Boolean).length, seconds);
  if (content.kind === "outro") return [0];
  return sceneEvents(content.scene, seconds);
};

const isSketchy = ({ content }: Segment): boolean =>
  content.kind === "scene" && content.scene.type === "custom" && content.scene.component === "sketch";

export const Reel = (props: ReelProps) => {
  const sketchy = props.segments.some(isSketchy);
  const starts = props.segments.reduce<number[]>(
    (acc, segment, index) => [...acc, index === 0 ? 0 : acc[index - 1] + props.segments[index - 1].duration],
    [],
  );

  return (
    <AbsoluteFill>
      {props.segments.map((segment, index) => {
        const context: SceneContext = {
          step: segment.step,
          total: props.total,
          duration: segment.duration,
          events: eventsOf(segment),
          handle: props.handle,
          avatar: props.avatar,
        };
        return (
          <Sequence key={segment.id} from={starts[index]} durationInFrames={segment.duration}>
            {renderContent(segment, context, sketchy)}
            {segment.content.kind === "scene" && segment.content.scene.beats && <Beats beats={segment.content.scene.beats} />}
            {sketchy ? <SketchCaptions words={segment.words} /> : <Captions words={segment.words} />}
            {segment.audio && <Audio src={staticFile(`audio/${segment.audio}`)} playbackRate={PLAYBACK_SPEED} startFrom={segment.audioStartFrom} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
