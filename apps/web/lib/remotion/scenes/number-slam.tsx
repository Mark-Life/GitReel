"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ScreenShake } from "../effects/screen-shake";
import type { NumberSlamProps } from "../types";

interface StatItem {
  label: string;
  value: number;
}

const formatNumber = (n: number) => {
  if (n >= 10_000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toLocaleString();
};

/** Full-screen rapid-fire stat counters that slam in with screen shake */
export function NumberSlam({
  totalCommits,
  stars,
  contributorCount,
  linesOfCode,
}: NumberSlamProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const stats: StatItem[] = [
    ...(linesOfCode ? [{ label: "LINES OF CODE", value: linesOfCode }] : []),
    { label: "COMMITS", value: totalCommits },
    { label: "CONTRIBUTORS", value: contributorCount },
    { label: "STARS", value: stars },
  ];

  const framesPerStat = Math.floor(durationInFrames / stats.length);

  const currentIndex = Math.min(
    Math.floor(frame / framesPerStat),
    stats.length - 1
  );
  const localFrame = frame - currentIndex * framesPerStat;
  const stat = stats[currentIndex] ?? stats[0];
  if (!stat) {
    return null;
  }

  const scale = spring({
    frame: localFrame,
    fps,
    from: 2.5,
    to: 1,
    config: { damping: 8, mass: 0.6, stiffness: 200 },
  });

  const countUp = Math.floor(
    interpolate(localFrame, [0, framesPerStat * 0.6], [0, stat.value], {
      extrapolateRight: "clamp",
    })
  );

  const showShake = localFrame >= 4 && localFrame <= 14;

  const inner = (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontFamily: "monospace",
            fontWeight: "bold",
            color: "white",
          }}
        >
          {formatNumber(countUp)}
        </span>
        <span
          style={{
            fontSize: 36,
            fontFamily: "monospace",
            fontWeight: "bold",
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 4,
          }}
        >
          {stat.label}
        </span>
      </div>
    </AbsoluteFill>
  );

  if (showShake) {
    return <ScreenShake intensity={10}>{inner}</ScreenShake>;
  }
  return inner;
}
