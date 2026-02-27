"use client";

import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { WrappedCardProps } from "../types";

/** Spotify Wrapped-style stats card with staggered fade-in */
export function WrappedCard({ timeline }: WrappedCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const langCount = Object.keys(timeline.languages).length;
  const ageText =
    timeline.repoAgeYears < 1
      ? `${Math.max(1, Math.round(timeline.repoAgeYears * 12))} months old`
      : `${timeline.repoAgeYears.toFixed(1)} years old`;
  const lines = [
    `${timeline.totalCommits.toLocaleString()} commits`,
    `${timeline.contributors.length} contributors`,
    `${langCount} languages`,
    `${timeline.meta.stars.toLocaleString()} stars`,
    ageText,
  ];

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(135deg, #1a0033 0%, #0d1117 50%, #001a1a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        padding: "0 80px",
      }}
    >
      <span
        style={{
          fontSize: 32,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.4)",
          fontWeight: "bold",
          letterSpacing: 4,
        }}
      >
        YOUR REPO WRAPPED
      </span>

      {lines.map((line, i) => {
        const s = spring({
          frame,
          fps,
          delay: 10 + i * 10,
          config: { damping: 14 },
        });
        return (
          <span
            key={line}
            style={{
              fontSize: 44,
              fontFamily: "monospace",
              color: "white",
              fontWeight: "bold",
              opacity: s,
              transform: `translateY(${(1 - s) * 20}px)`,
            }}
          >
            {line}
          </span>
        );
      })}
    </AbsoluteFill>
  );
}
