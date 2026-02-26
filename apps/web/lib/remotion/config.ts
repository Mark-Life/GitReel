import type { TreemapKeyframe } from "../video/types";
import type { SceneTimings, VideoConfig, VideoTimeline } from "./types";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const TITLE_SECONDS = 3;
const STATS_SECONDS = 10;
const OUTRO_SECONDS = 5;
const MIN_TIMELAPSE_SECONDS = 15;
const MAX_TIMELAPSE_SECONDS = 45;
const SECONDS_PER_KEYFRAME = 0.5;

const TREEMAP_WIDTH = 1080;
const TREEMAP_HEIGHT = 1150;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Compute timelapse duration in seconds from keyframe count */
const computeTimelapseDuration = (keyframeCount: number) =>
  clamp(
    keyframeCount * SECONDS_PER_KEYFRAME,
    MIN_TIMELAPSE_SECONDS,
    MAX_TIMELAPSE_SECONDS
  );

/** Compute scene timings and total video config from timeline data */
export const computeVideoConfig = (
  _timeline: VideoTimeline,
  keyframes: TreemapKeyframe[]
) => {
  const timelapseSec = computeTimelapseDuration(keyframes.length);
  const totalSec = TITLE_SECONDS + timelapseSec + STATS_SECONDS + OUTRO_SECONDS;

  const titleFrames = TITLE_SECONDS * FPS;
  const timelapseFrames = Math.round(timelapseSec * FPS);
  const statsFrames = STATS_SECONDS * FPS;
  const outroFrames = OUTRO_SECONDS * FPS;

  const timings: SceneTimings = {
    title: { from: 0, durationInFrames: titleFrames },
    timelapse: { from: titleFrames, durationInFrames: timelapseFrames },
    stats: {
      from: titleFrames + timelapseFrames,
      durationInFrames: statsFrames,
    },
    outro: {
      from: titleFrames + timelapseFrames + statsFrames,
      durationInFrames: outroFrames,
    },
  };

  const config: VideoConfig = {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: Math.round(totalSec * FPS),
  };

  return {
    config,
    timings,
    treemapWidth: TREEMAP_WIDTH,
    treemapHeight: TREEMAP_HEIGHT,
  };
};
