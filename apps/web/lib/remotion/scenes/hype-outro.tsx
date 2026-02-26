"use client";

import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { HypeOutroProps } from "../types";

/** Closing CTA with pulsing glow */
export function HypeOutro({ repoName }: HypeOutroProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 14 } });
  const glow = 0.6 + 0.4 * Math.sin(frame * 0.1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity: fadeIn,
      }}
    >
      <span
        style={{
          fontSize: 48,
          fontFamily: "monospace",
          fontWeight: "bold",
          color: "white",
        }}
      >
        {repoName}
      </span>
      <span
        style={{
          fontSize: 32,
          fontFamily: "monospace",
          color: `rgba(100,200,255,${glow})`,
        }}
      >
        Generate yours → gitreel.dev
      </span>
    </AbsoluteFill>
  );
}
