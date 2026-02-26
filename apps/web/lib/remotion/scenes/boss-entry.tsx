"use client";

import {
  AbsoluteFill,
  Img,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { BossEntryProps } from "../types";

/** Top 3 contributors with staggered spring entrance and commit counts */
export function BossEntry({ contributors }: BossEntryProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const top3 = contributors.slice(0, 3);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
      }}
    >
      {top3.map((c, i) => {
        const s = spring({
          frame,
          fps,
          delay: i * 12,
          config: { damping: 10 },
        });
        const size = 160 - i * 30;
        return (
          <div
            key={c.login}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 30,
              opacity: s,
              transform: `scale(${s})`,
            }}
          >
            <Img
              src={c.avatarUrl}
              style={{ width: size, height: size, borderRadius: "50%" }}
            />
            <div style={{ fontFamily: "monospace", color: "white" }}>
              <div style={{ fontSize: 36 - i * 4, fontWeight: "bold" }}>
                @{c.login}
              </div>
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
                {c.contributions} commits
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
