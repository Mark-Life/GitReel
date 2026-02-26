import type { TreemapKeyframe, TreemapRect } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolate between two keyframes, matching rects by id (file path) */
export const interpolateKeyframes = (
  a: TreemapKeyframe,
  b: TreemapKeyframe,
  t: number
): TreemapRect[] => {
  const aMap = new Map(a.rects.map((r) => [r.id, r]));
  const bMap = new Map(b.rects.map((r) => [r.id, r]));
  const allIds = new Set([...aMap.keys(), ...bMap.keys()]);
  const rects: TreemapRect[] = [];

  for (const id of allIds) {
    const ra = aMap.get(id);
    const rb = bMap.get(id);

    if (ra && rb) {
      rects.push({
        ...rb,
        x: lerp(ra.x, rb.x, t),
        y: lerp(ra.y, rb.y, t),
        w: lerp(ra.w, rb.w, t),
        h: lerp(ra.h, rb.h, t),
        opacity: 1,
      });
    } else if (rb) {
      rects.push({ ...rb, opacity: t });
    } else if (ra) {
      rects.push({ ...ra, opacity: 1 - t });
    }
  }

  return rects;
};

/** Get interpolated rects for a specific video frame */
export const getFrameData = (
  frame: number,
  keyframes: TreemapKeyframe[],
  totalFrames: number
) => {
  const [first] = keyframes;
  if (!first) {
    return { rects: [] as TreemapRect[], progress: 0, keyframeIndex: 0 };
  }

  if (keyframes.length === 1) {
    return { rects: first.rects, progress: 0, keyframeIndex: 0 };
  }

  const segments = keyframes.length - 1;
  const framesPerSegment = totalFrames / segments;
  const segment = Math.min(Math.floor(frame / framesPerSegment), segments - 1);
  const t = (frame - segment * framesPerSegment) / framesPerSegment;
  const clampedT = Math.max(0, Math.min(1, t));

  const a = keyframes[segment] ?? first;
  const b = keyframes[segment + 1] ?? keyframes[segments] ?? first;

  return {
    rects: interpolateKeyframes(a, b, clampedT),
    progress: frame / totalFrames,
    keyframeIndex: segment,
  };
};
