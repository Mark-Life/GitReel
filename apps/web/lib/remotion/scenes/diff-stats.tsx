"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TreemapKeyframe } from "../../video/types";
import type { DiffStatsProps, VideoTimelineCommit } from "../types";

interface DiffMoment {
  commitMessage: string;
  commitSha: string;
  date: string;
  filesAdded: number;
  filesChanged: number;
  filesRemoved: number;
}

/** Compute diff stats between consecutive keyframes, return top N by magnitude */
const computeTopDiffs = (
  keyframes: TreemapKeyframe[],
  commits: VideoTimelineCommit[],
  topN: number
): DiffMoment[] => {
  const commitMap = new Map(commits.map((c) => [c.sha, c]));
  const diffs: DiffMoment[] = [];

  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1];
    const curr = keyframes[i];
    if (!(prev && curr)) {
      continue;
    }

    const prevIds = new Set(prev.rects.map((r) => r.id));
    const currIds = new Set(curr.rects.map((r) => r.id));

    let filesAdded = 0;
    let filesRemoved = 0;
    let filesChanged = 0;

    for (const id of currIds) {
      if (prevIds.has(id)) {
        filesChanged++;
      } else {
        filesAdded++;
      }
    }
    for (const id of prevIds) {
      if (!currIds.has(id)) {
        filesRemoved++;
      }
    }

    const commit = commitMap.get(curr.commitSha);
    const magnitude = filesAdded + filesRemoved + filesChanged;

    if (magnitude > 0) {
      diffs.push({
        commitMessage: commit?.message ?? curr.commitSha.slice(0, 7),
        commitSha: curr.commitSha.slice(0, 7),
        date: curr.date,
        filesAdded,
        filesRemoved,
        filesChanged,
      });
    }
  }

  diffs.sort(
    (a, b) =>
      b.filesAdded +
      b.filesRemoved +
      b.filesChanged -
      (a.filesAdded + a.filesRemoved + a.filesChanged)
  );

  return diffs.slice(0, topN);
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** GitHub-style diff stats for significant commits */
export function DiffStats({ keyframes, commits }: DiffStatsProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const moments = computeTopDiffs(keyframes, commits, 4);
  if (moments.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: "#0d1117" }} />;
  }

  const framesPerMoment = Math.floor(durationInFrames / moments.length);
  const currentIdx = Math.min(
    Math.floor(frame / framesPerMoment),
    moments.length - 1
  );
  const localFrame = frame - currentIdx * framesPerMoment;
  const moment = moments[currentIdx];

  if (!moment) {
    return <AbsoluteFill style={{ backgroundColor: "#0d1117" }} />;
  }

  // Message entrance
  const messageY = spring({
    frame: localFrame,
    fps,
    from: 60,
    to: 0,
    config: { damping: 12, mass: 0.6, stiffness: 160 },
  });

  const messageOpacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Counter animations
  const counterProgress = interpolate(
    localFrame,
    [5, framesPerMoment * 0.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const addedCount = Math.floor(counterProgress * moment.filesAdded);
  const removedCount = Math.floor(counterProgress * moment.filesRemoved);
  const changedCount = Math.floor(counterProgress * moment.filesChanged);

  // Bar animations
  const maxFiles = Math.max(
    moment.filesAdded,
    moment.filesRemoved,
    moment.filesChanged,
    1
  );
  const barMaxWidth = 500;

  const barScale = spring({
    frame: localFrame,
    fps,
    delay: 8,
    from: 0,
    to: 1,
    config: { damping: 10, mass: 0.5, stiffness: 120 },
  });

  // Meta fade
  const metaOpacity = interpolate(localFrame, [12, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit fade
  const exitOpacity = interpolate(
    localFrame,
    [framesPerMoment - 6, framesPerMoment],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Truncate message to first line, max 60 chars
  const displayMessage =
    moment.commitMessage.split("\n")[0]?.slice(0, 60) ?? "";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Commit message */}
      <div
        style={{
          transform: `translateY(${messageY}px)`,
          opacity: messageOpacity,
          textAlign: "center",
          marginBottom: 24,
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontFamily: "monospace",
            color: "white",
            fontWeight: "bold",
            lineHeight: 1.4,
            marginBottom: 16,
          }}
        >
          {displayMessage}
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.35)",
            opacity: metaOpacity,
          }}
        >
          {moment.commitSha} &middot; {formatDate(moment.date)}
        </div>
      </div>

      {/* Diff bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: 700,
          paddingTop: 40,
        }}
      >
        {moment.filesAdded > 0 && (
          <DiffBar
            barMaxWidth={barMaxWidth}
            color="#3fb950"
            count={addedCount}
            label="added"
            maxFiles={maxFiles}
            scale={barScale}
          />
        )}
        {moment.filesRemoved > 0 && (
          <DiffBar
            barMaxWidth={barMaxWidth}
            color="#f85149"
            count={removedCount}
            label="removed"
            maxFiles={maxFiles}
            scale={barScale}
          />
        )}
        {moment.filesChanged > 0 && (
          <DiffBar
            barMaxWidth={barMaxWidth}
            color="#d29922"
            count={changedCount}
            label="changed"
            maxFiles={maxFiles}
            scale={barScale}
          />
        )}
      </div>

      {/* Total files changed */}
      <div
        style={{
          marginTop: 40,
          fontSize: 22,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.4)",
          opacity: metaOpacity,
        }}
      >
        {moment.filesAdded + moment.filesRemoved + moment.filesChanged} files
        touched
      </div>
    </AbsoluteFill>
  );
}

function DiffBar({
  color,
  count,
  label,
  maxFiles,
  barMaxWidth,
  scale,
}: {
  barMaxWidth: number;
  color: string;
  count: number;
  label: string;
  maxFiles: number;
  scale: number;
}) {
  const barWidth = (count / maxFiles) * barMaxWidth * scale;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span
        style={{
          fontSize: 42,
          fontFamily: "monospace",
          fontWeight: "bold",
          color,
          width: 180,
          textAlign: "right",
        }}
      >
        {label === "removed" ? "-" : "+"}
        {count}
      </span>
      <div
        style={{
          height: 24,
          width: barWidth,
          backgroundColor: color,
          borderRadius: 4,
          minWidth: count > 0 ? 4 : 0,
        }}
      />
      <span
        style={{
          fontSize: 18,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
