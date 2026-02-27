"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getLanguageColor } from "../../video/language-colors";
import type { LanguagePieProps } from "../types";

const CX = 540;
const CY = 480;
const RADIUS = 200;
const STROKE_WIDTH = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_SEGMENTS = 6;
const GROW_DURATION = 25;
const SEGMENT_DELAY = 8;

interface Segment {
  color: string;
  fraction: number;
  name: string;
}

/** Prepare sorted segments, collapsing tail into "Other" */
const prepareSegments = (languages: Record<string, number>): Segment[] => {
  const entries = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) {
    return [];
  }

  const top = entries.slice(0, MAX_SEGMENTS);
  const rest = entries.slice(MAX_SEGMENTS);
  const restSum = rest.reduce((sum, [, v]) => sum + v, 0);

  const segments: Segment[] = top.map(([name, bytes]) => ({
    name,
    fraction: bytes / total,
    color: getLanguageColor(name),
  }));

  if (restSum > 0) {
    segments.push({
      name: "Other",
      fraction: restSum / total,
      color: getLanguageColor(null),
    });
  }

  return segments;
};

/** Animated donut chart showing repository language breakdown */
export function LanguagePie({ languages }: LanguagePieProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segments = prepareSegments(languages);

  let cumulativeOffset = 0;

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
        aria-label="Language breakdown donut chart"
        height={CY * 2}
        role="img"
        style={{ position: "absolute" }}
        viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        width={CX * 2}
      >
        {segments.map((seg, i) => {
          const segLen = CIRCUMFERENCE * seg.fraction;
          const delay = i * SEGMENT_DELAY;

          const growProgress = interpolate(
            frame,
            [delay, delay + GROW_DURATION],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const dashLen = segLen * growProgress;
          const offset = cumulativeOffset;
          cumulativeOffset += segLen;

          return (
            <circle
              cx={CX}
              cy={CY}
              fill="none"
              key={seg.name}
              r={RADIUS}
              stroke={seg.color}
              strokeDasharray={`${dashLen} ${CIRCUMFERENCE - dashLen}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              strokeWidth={STROKE_WIDTH}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          );
        })}
      </svg>

      {/* Labels */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 20px",
          padding: "0 40px",
          maxWidth: CX * 2 - 80,
        }}
      >
        {segments.map((seg, i) => {
          const labelProgress = spring({
            frame,
            fps,
            delay: i * SEGMENT_DELAY + GROW_DURATION - 5,
            config: { damping: 200 },
          });

          return (
            <div
              key={seg.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: labelProgress,
                transform: `translateY(${(1 - labelProgress) * 10}px)`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "monospace",
                  fontSize: 16,
                  whiteSpace: "nowrap",
                }}
              >
                {seg.name} ({(seg.fraction * 100).toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
