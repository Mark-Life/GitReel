"use client";

import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { OutroProps } from "../types";

/** Outro scene — summary text and branding */
export function Outro({ contributorCount, repoAgeYears }: OutroProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 200 } });
  const brandFade = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });

  const yearsText =
    repoAgeYears < 1
      ? "less than a year"
      : `${Math.round(repoAgeYears)} year${Math.round(repoAgeYears) === 1 ? "" : "s"}`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: 32,
          fontFamily: "monospace",
          textAlign: "center",
          opacity: fadeIn,
          lineHeight: 1.6,
          padding: "0 60px",
        }}
      >
        Built by {contributorCount} contributor
        {contributorCount === 1 ? "" : "s"} over {yearsText}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 20,
          fontFamily: "monospace",
          opacity: brandFade,
        }}
      >
        Made with GitReel
      </span>
    </AbsoluteFill>
  );
}
