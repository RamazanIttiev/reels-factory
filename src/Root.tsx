import { Composition } from "remotion";
import ru from "../episodes/cache-stampede/ru.json";
import visual from "../episodes/cache-stampede/visual.json";
import { Cover } from "./Cover";
import type { CoverProps } from "./Cover";
import { resolveEpisode } from "./episode";
import { Reel } from "./Reel";
import { FPS, HEIGHT, WIDTH, buildTimeline, totalFrames } from "./timeline";
import { isLang, isVisual } from "./types";

const defaultProps = isVisual(visual) && isLang(ru) ? buildTimeline(resolveEpisode(visual, ru)) : undefined;

const coverProps: CoverProps | undefined =
  isVisual(visual) && isLang(ru) ? { hook: ru.hook, item: visual.item } : undefined;

export const RemotionRoot = () => (
  <>
    {defaultProps && (
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
    )}
    {coverProps && (
      <Composition
        id="Cover"
        component={Cover}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={1}
        defaultProps={coverProps}
      />
    )}
  </>
);
