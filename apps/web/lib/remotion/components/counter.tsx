"use client";

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface CounterProps {
  label: string;
  target: number;
}

/** Animated counter that ticks from 0 to target with spring fade-in */
export function Counter({ target, label }: CounterProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const count = Math.floor(
    interpolate(frame, [0, durationInFrames * 0.8], [0, target], {
      extrapolateRight: "clamp",
    })
  );

  const fadeIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        color: "white",
        fontFamily: "monospace",
        fontSize: 28,
        opacity: fadeIn,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
        {label}
      </span>
      <span>{count.toLocaleString()}</span>
    </div>
  );
}
