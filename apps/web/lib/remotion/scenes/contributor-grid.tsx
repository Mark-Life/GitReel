"use client";

import {
  AbsoluteFill,
  Img,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ContributorGridProps } from "../types";

const MAX_CONTRIBUTORS = 24;
const COLUMNS = 5;
const AVATAR_SIZE = 100;
const STAGGER_DELAY = 3;

/** Initials fallback for contributors without avatar */
const getInitials = (login: string) => login.slice(0, 2).toUpperCase();

/** Single avatar cell with spring pop-in */
function AvatarCell({
  avatarUrl,
  index,
  login,
}: {
  avatarUrl: string;
  index: number;
  login: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay: index * STAGGER_DELAY,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: progress,
        transform: `scale(${progress})`,
      }}
    >
      <div
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarUrl ? (
          <Img
            src={avatarUrl}
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "monospace",
              fontSize: 28,
              fontWeight: "bold",
            }}
          >
            {getInitials(login)}
          </span>
        )}
      </div>
      <span
        style={{
          color: "rgba(255,255,255,0.7)",
          fontFamily: "monospace",
          fontSize: 11,
          maxWidth: AVATAR_SIZE,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {login}
      </span>
    </div>
  );
}

/** Contributor grid hall-of-fame — top contributors by commit count */
export function ContributorGrid({ contributors }: ContributorGridProps) {
  const sorted = [...contributors]
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, MAX_CONTRIBUTORS);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: 20,
          justifyItems: "center",
        }}
      >
        {sorted.map((c, i) => (
          <AvatarCell
            avatarUrl={c.avatarUrl}
            index={i}
            key={c.login}
            login={c.login}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
