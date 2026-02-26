"use client";

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { GlitchTransitionProps } from "../types";

/** RGB-split glitch overlay between scenes (3-5 frames) */
export function GlitchTransition({ durationInFrames }: GlitchTransitionProps) {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  const intensity = Math.sin(progress * Math.PI);
  const stripeCount = 8;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Horizontal noise stripes */}
      {Array.from({ length: stripeCount }, (_, i) => {
        const top = `${(i / stripeCount) * 100 + Math.sin(frame * 13 + i) * 3}%`;
        const height = `${(1 / stripeCount) * 100 * 0.4}%`;
        return (
          <div
            key={`stripe-${i.toString()}`}
            style={{
              position: "absolute",
              top,
              left: 0,
              right: 0,
              height,
              backgroundColor: `rgba(255,255,255,${0.15 * intensity})`,
              transform: `translateX(${Math.sin(frame * 7 + i * 5) * 20 * intensity}px)`,
            }}
          />
        );
      })}

      {/* Red channel offset */}
      <AbsoluteFill
        style={{
          backgroundColor: "rgba(255,0,0,0.12)",
          mixBlendMode: "screen",
          transform: `translateX(${-8 * intensity}px)`,
          opacity: intensity,
        }}
      />

      {/* Cyan channel offset */}
      <AbsoluteFill
        style={{
          backgroundColor: "rgba(0,255,255,0.12)",
          mixBlendMode: "screen",
          transform: `translateX(${8 * intensity}px)`,
          opacity: intensity,
        }}
      />
    </AbsoluteFill>
  );
}
