"use client";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CodeRainProps } from "../types";

const COL_WIDTH = 36;
const CHAR_H = 34;
const TRAIL_LEN = 18;
const GLOW = "#00ff46";

/** Deterministic hash returning [0, 1) */
const hash = (n: number) => {
  const x = Math.sin(n * 9301 + 49_297) * 49_267;
  return x - Math.floor(x);
};

/** Build character array from commit messages mixed with code symbols */
const buildPool = (commits: CodeRainProps["commits"]) => {
  const code = "{}[]();=><>/|&#$%*+-_~0123456789abcdefABCDEF";
  const msgs = commits
    .map((c) => c.message)
    .join("")
    .replace(/\s/g, "");
  const raw = msgs.length > 0 ? msgs + code : code.repeat(3);
  return [...raw];
};

/** Matrix-style falling code characters sourced from commit messages */
export function CodeRain({ commits }: CodeRainProps) {
  const frame = useCurrentFrame();
  const { height, durationInFrames } = useVideoConfig();

  const pool = buildPool(commits);
  const colCount = Math.floor(1080 / COL_WIDTH);
  const rowCount = Math.ceil(height / CHAR_H);
  const wrapLen = rowCount + TRAIL_LEN + 10;

  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        overflow: "hidden",
        opacity: fadeIn * fadeOut,
      }}
    >
      {Array.from({ length: colCount }, (_, ci) => {
        const speed = 0.3 + hash(ci * 7 + 1) * 0.5;
        const offset = hash(ci * 13 + 3) * wrapLen;
        const headRow = ((offset + frame * speed) % wrapLen) - TRAIL_LEN;
        const dim = 0.5 + hash(ci * 31 + 11) * 0.5;

        return (
          <div
            key={`col-${ci.toString()}`}
            style={{
              position: "absolute",
              left: ci * COL_WIDTH,
              top: 0,
              width: COL_WIDTH,
              height: "100%",
            }}
          >
            {Array.from({ length: TRAIL_LEN }, (_, t) => {
              const row = headRow - t;
              const y = row * CHAR_H;

              if (y < -CHAR_H || y > height) {
                return null;
              }

              const flickerSeed =
                ci * 1000 + t * 37 + (t % 3 === 0 ? Math.floor(frame / 4) : 0);
              const char =
                pool[Math.floor(hash(flickerSeed) * pool.length) % pool.length];

              const isHead = t === 0;
              const trailOpacity =
                interpolate(t, [0, TRAIL_LEN], [0.85, 0], {
                  extrapolateRight: "clamp",
                }) * dim;

              const opacity = isHead ? dim : trailOpacity;
              if (opacity <= 0.01) {
                return null;
              }

              return (
                <span
                  key={`trail-${t.toString()}`}
                  style={{
                    position: "absolute",
                    top: y,
                    width: COL_WIDTH,
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontSize: 28,
                    lineHeight: `${CHAR_H}px`,
                    color: isHead
                      ? `rgba(255,255,255,${dim})`
                      : `rgba(0,255,70,${opacity})`,
                    textShadow: isHead
                      ? `0 0 10px rgba(0,255,70,${dim}), 0 0 20px rgba(0,255,70,${dim * 0.5})`
                      : `0 0 ${Math.round(8 * opacity)}px ${GLOW}`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
