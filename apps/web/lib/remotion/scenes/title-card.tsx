"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Counter } from "../components/counter";
import type { TitleCardProps } from "../types";

/** Title card scene — repo name, description, animated stat counters */
export function TitleCard({
  meta,
  totalCommits,
  contributorCount,
}: TitleCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);

  const descSpring = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 200 },
  });

  const statsSpring = spring({
    frame,
    fps,
    delay: 20,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: "0 60px",
        }}
      >
        {/* Repo name */}
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleSpring,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 52,
              fontFamily: "monospace",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {meta.fullName}
          </span>
        </div>

        {/* Description */}
        {meta.description && (
          <div style={{ opacity: descSpring }}>
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 22,
                fontFamily: "monospace",
                textAlign: "center",
                lineHeight: 1.5,
                maxWidth: 900,
                display: "block",
              }}
            >
              {meta.description}
            </span>
          </div>
        )}

        {/* Stat counters */}
        <div
          style={{
            display: "flex",
            gap: 50,
            marginTop: 30,
            opacity: statsSpring,
          }}
        >
          <Counter label="commits" target={totalCommits} />
          <Counter label="stars" target={meta.stars} />
          <Counter label="contributors" target={contributorCount} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
