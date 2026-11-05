import { Composition } from "remotion";
import ru from "../episodes/cache-stampede/ru.json";
import visual from "../episodes/cache-stampede/visual.json";
import { resolveEpisode } from "./episode";
import { Reel } from "./Reel";
import { FPS, HEIGHT, WIDTH, buildTimeline, totalFrames } from "./timeline";
import { isLang, isVisual } from "./types";

const defaultProps = isVisual(visual) && isLang(ru) ? buildTimeline(resolveEpisode(visual, ru)) : undefined;

export const RemotionRoot = () =>
  defaultProps ? (
    <Composition
      id="Reel"
      component={Reel}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={totalFrames(defaultProps)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
    />
  ) : null;
