import type { TreemapKeyframe } from "../video/types";
import type {
  HypeSceneTimings,
  SceneTiming,
  VideoConfig,
  VideoTimeline,
} from "./types";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

export const GLITCH_FRAMES = 5;

const TITLE_SECONDS = 2;
const NUMBERS_SECONDS = 3;
const DIFF_STATS_SECONDS = 4;
const BOSS_SECONDS = 3;
const WRAPPED_SECONDS = 5;
const OUTRO_SECONDS = 3;

const MIN_TIMELAPSE_SECONDS = 15;
const MAX_TIMELAPSE_SECONDS = 45;
const SECONDS_PER_KEYFRAME = 0.5;

const TREEMAP_WIDTH = 1080;
const TREEMAP_HEIGHT = 1150;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeTimelapseDuration = (keyframeCount: number) =>
  clamp(
    keyframeCount * SECONDS_PER_KEYFRAME,
    MIN_TIMELAPSE_SECONDS,
    MAX_TIMELAPSE_SECONDS
  );

/** Build sequential scene timing starting at a given frame offset */
const timing = (from: number, seconds: number): SceneTiming => ({
  from,
  durationInFrames: Math.round(seconds * FPS),
});

/** Compute hype composition config and scene timings */
export const computeHypeConfig = (
  _timeline: VideoTimeline,
  keyframes: TreemapKeyframe[]
) => {
  const timelapseSec = computeTimelapseDuration(keyframes.length);

  let cursor = 0;
  const title = timing(cursor, TITLE_SECONDS);
  cursor += title.durationInFrames;

  const numbers = timing(cursor, NUMBERS_SECONDS);
  cursor += numbers.durationInFrames;

  const diffStats = timing(cursor, DIFF_STATS_SECONDS);
  cursor += diffStats.durationInFrames;

  const timelapse = timing(cursor, timelapseSec);
  cursor += timelapse.durationInFrames;

  const boss = timing(cursor, BOSS_SECONDS);
  cursor += boss.durationInFrames;

  const wrapped = timing(cursor, WRAPPED_SECONDS);
  cursor += wrapped.durationInFrames;

  const outro = timing(cursor, OUTRO_SECONDS);
  cursor += outro.durationInFrames;

  const timings: HypeSceneTimings = {
    title,
    numbers,
    diffStats,
    timelapse,
    boss,
    wrapped,
    outro,
  };

  const config: VideoConfig = {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: cursor,
  };

  return {
    config,
    timings,
    treemapWidth: TREEMAP_WIDTH,
    treemapHeight: TREEMAP_HEIGHT,
  };
};
