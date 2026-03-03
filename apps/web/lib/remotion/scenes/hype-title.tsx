"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ScreenShake } from "../effects/screen-shake";
import type { HypeTitleProps } from "../types";

const IMPACT_FRAME = 8;

/** Full-screen repo name slam with chromatic aberration and screen shake */
export function HypeTitle({ meta }: HypeTitleProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    from: 3,
    to: 1,
    config: { damping: 8, mass: 0.8, stiffness: 200 },
  });

  const opacity = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const nameLen = meta.fullName.length;
  let fontSize = 72;
  if (nameLen > 20) {
    fontSize = 56;
  } else if (nameLen > 14) {
    fontSize = 64;
  }

  const textStyle = {
    fontSize,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
  };

  const showShake = frame >= IMPACT_FRAME - 2;

  const inner = (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          position: "relative",
          padding: "0 40px",
        }}
      >
        <span style={{ ...textStyle, color: "white" }}>{meta.fullName}</span>
      </div>
    </AbsoluteFill>
  );

  if (showShake) {
    return <ScreenShake intensity={12}>{inner}</ScreenShake>;
  }
  return inner;
}
