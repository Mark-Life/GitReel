"use client";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PulseRingProps } from "../types";

const CENTER_RADIUS = 40;
const MAX_RING_RADIUS = 300;
const MAX_VISIBLE_RINGS = 15;
const RING_LIFESPAN = 40;
const TIMELINE_FILL = 0.85;

/** Map commit timestamps to frame offsets spread across the duration */
const mapCommitsToFrames = (
  commits: PulseRingProps["commits"],
  totalFrames: number
) => {
  if (commits.length === 0) {
    return [];
  }

  const sorted = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const [first] = sorted;
  const last = sorted.at(-1);
  if (!first) {
    return [];
  }
  if (!last) {
    return [];
  }
  const minTime = new Date(first.date).getTime();
  const maxTime = new Date(last.date).getTime();
  const range = maxTime - minTime || 1;
  const usableFrames = totalFrames * TIMELINE_FILL;

  return sorted.map((c) => ({
    frame: Math.round(
      ((new Date(c.date).getTime() - minTime) / range) * usableFrames
    ),
    date: c.date,
  }));
};

/** Expanding ring heartbeat — each commit triggers an outward pulse */
export function PulseRing({ commits }: PulseRingProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const mapped = mapCommitsToFrames(commits, durationInFrames);

  const breathScale = interpolate(
    Math.sin(frame * 0.15),
    [-1, 1],
    [0.95, 1.05]
  );

  const activeRings = mapped
    .filter((m) => frame >= m.frame && frame - m.frame < RING_LIFESPAN)
    .slice(-MAX_VISIBLE_RINGS);

  const currentDate =
    [...mapped].reverse().find((m) => frame >= m.frame)?.date ?? null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        aria-label="Commit pulse visualization"
        height="100%"
        role="img"
        style={{ position: "absolute" }}
        viewBox="0 0 1080 960"
        width="100%"
      >
        {/* Expanding rings */}
        {activeRings.map((ring) => {
          const age = frame - ring.frame;
          const progress = age / RING_LIFESPAN;

          const radius = interpolate(
            progress,
            [0, 1],
            [CENTER_RADIUS, MAX_RING_RADIUS]
          );
          const opacity = interpolate(progress, [0, 0.3, 1], [0.8, 0.5, 0]);

          return (
            <circle
              cx={540}
              cy={480}
              fill="none"
              key={ring.frame}
              opacity={opacity}
              r={radius}
              stroke="#58a6ff"
              strokeWidth={2}
            />
          );
        })}

        {/* Center circle */}
        <g
          transform={`translate(540, 480) scale(${breathScale}) translate(-540, -480)`}
        >
          <circle
            cx={540}
            cy={480}
            fill="#58a6ff"
            opacity={0.9}
            r={CENTER_RADIUS}
          />
        </g>
      </svg>

      {/* Date overlay */}
      {currentDate && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            fontFamily: "monospace",
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {new Date(currentDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      )}
    </AbsoluteFill>
  );
}
