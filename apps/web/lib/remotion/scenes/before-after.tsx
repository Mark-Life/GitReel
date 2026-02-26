"use client";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TreemapCanvas } from "../components/treemap-canvas";
import type { BeforeAfterProps } from "../types";

/** Before/after treemap split with horizontal wipe reveal */
export function BeforeAfter({
  firstRects,
  lastRects,
  treemapWidth,
  treemapHeight,
}: BeforeAfterProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const wipe = interpolate(frame, [10, durationInFrames * 0.6], [100, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* "Before" left side */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          clipPath: "inset(0 0 0 0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TreemapCanvas
          height={treemapHeight}
          rects={firstRects}
          width={treemapWidth}
        />
      </div>

      {/* "After" right side with wipe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          clipPath: `inset(0 0 0 ${wipe - 50}%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TreemapCanvas
          height={treemapHeight}
          rects={lastRects}
          width={treemapWidth}
        />
      </div>

      {/* Labels */}
      <span
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          fontSize: 36,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.5)",
          fontWeight: "bold",
        }}
      >
        DAY 1
      </span>
      <span
        style={{
          position: "absolute",
          top: 80,
          right: 60,
          fontSize: 36,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.5)",
          fontWeight: "bold",
        }}
      >
        TODAY
      </span>
    </AbsoluteFill>
  );
}
