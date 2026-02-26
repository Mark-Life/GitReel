"use client";

import {
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const AVATAR_SIZE = 64;
const HOLD_FRAMES = 15;
const WHITESPACE_RE = /\s+/;

interface AvatarPopupProps {
  avatarUrl: string | null;
  name: string;
}

/** Spring scale-in/out avatar popup with initials fallback */
export function AvatarPopup({ avatarUrl, name }: AvatarPopupProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scaleIn = spring({ frame, fps, config: { damping: 200 } });
  const outStart = durationInFrames - HOLD_FRAMES;
  const scaleOut =
    frame > outStart
      ? 1 -
        spring({
          frame: frame - outStart,
          fps,
          config: { damping: 200 },
        })
      : 1;

  const scale = interpolate(scaleIn * scaleOut, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const opacity = scale;

  const initials = name
    .split(WHITESPACE_RE)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "top right",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.9)",
          fontFamily: "monospace",
          fontSize: 14,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {name}
      </span>
      <div
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: AVATAR_SIZE / 2,
          overflow: "hidden",
          backgroundColor: "#333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255,255,255,0.3)",
        }}
      >
        {avatarUrl ? (
          <Img
            src={avatarUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              color: "white",
              fontFamily: "monospace",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
