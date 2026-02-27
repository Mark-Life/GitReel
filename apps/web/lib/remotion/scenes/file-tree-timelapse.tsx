"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  buildFileTree,
  diffFileSets,
  type FlatFileEntry,
  flattenTree,
} from "../../video/file-tree";
import type { TreemapKeyframe } from "../../video/types";
import { DateOverlay } from "../components/date-overlay";
import type { FileTreeTimelapseProps } from "../types";

const ROW_HEIGHT = 38;
const INDENT_PX = 28;
const FONT_SIZE = 26;
const VISIBLE_ROWS = 42;
const VISIBLE_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT;
const TOP_PADDING = 60;
const MIN_FRAMES_PER_KF = 4;
const GUTTER_WIDTH = 3;
const COMMIT_MSG_MAX_LEN = 50;

/**
 * Build a cumulative frame boundary array weighted by diff size.
 * Keyframes with new files get high weight; modify-only keyframes are fast.
 */
const buildFrameMap = (keyframes: TreemapKeyframe[], totalFrames: number) => {
  if (keyframes.length <= 1) {
    return [0, totalFrames];
  }

  const segments = keyframes.length - 1;
  const weights: number[] = [];
  for (let i = 0; i < segments; i++) {
    const prev = keyframes[i];
    const curr = keyframes[i + 1];
    if (!(prev && curr)) {
      weights.push(1);
      continue;
    }
    const { added, modified } = diffFileSets(prev.rects, curr.rects);
    if (added.size > 0) {
      weights.push(added.size + modified.size);
    } else {
      weights.push(Math.max(modified.size * 0.15, 1));
    }
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const reservedFrames = MIN_FRAMES_PER_KF * segments;
  const distributableFrames = Math.max(0, totalFrames - reservedFrames);

  const boundaries = [0];
  let cursor = 0;
  for (let i = 0; i < segments; i++) {
    const w = weights[i] ?? 1;
    const extra = Math.round((w / totalWeight) * distributableFrames);
    cursor += MIN_FRAMES_PER_KF + extra;
    boundaries.push(i === segments - 1 ? totalFrames : cursor);
  }
  return boundaries;
};

/** Look up keyframe index from weighted frame map via binary search */
const getKeyframeFromMap = (frame: number, boundaries: number[]) => {
  let lo = 0;
  let hi = boundaries.length - 2;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if ((boundaries[mid] ?? 0) <= frame) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const start = boundaries[lo] ?? 0;
  const end = boundaries[lo + 1] ?? 1;
  const localFrame = frame - start;
  const segmentFrames = end - start;
  return { index: lo, localFrame, segmentFrames };
};

/** VS Code-style file tree timelapse — files appear as the repo grows */
export function FileTreeTimelapse({
  commits,
  keyframes,
  totalCommits,
}: FileTreeTimelapseProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const frameMap = buildFrameMap(keyframes, durationInFrames);
  const {
    index: kfIndex,
    localFrame,
    segmentFrames,
  } = getKeyframeFromMap(frame, frameMap);

  const currentKf = keyframes[kfIndex];
  if (!currentKf) {
    return <AbsoluteFill style={{ backgroundColor: "#0d1117" }} />;
  }

  const prevKf = kfIndex > 0 ? keyframes[kfIndex - 1] : null;

  const tree = buildFileTree(currentKf.rects);
  const entries = flattenTree(tree, 5);

  const diff = prevKf
    ? diffFileSets(prevKf.rects, currentKf.rects)
    : {
        added: new Set(currentKf.rects.map((r) => r.id)),
        modified: new Set<string>(),
      };

  const hasNewFiles = diff.added.size > 0;
  const newEntryIndices = new Set<number>();
  const modifiedEntryIndices = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry && !entry.isDir) {
      if (diff.added.has(entry.path)) {
        newEntryIndices.add(i);
      } else if (!hasNewFiles && diff.modified.has(entry.path)) {
        modifiedEntryIndices.add(i);
      }
    }
  }

  // Auto-scroll to show new or modified files
  const firstNewIndex =
    [...newEntryIndices][0] ?? [...modifiedEntryIndices][0] ?? 0;
  const targetScrollRow = Math.max(0, firstNewIndex - 4);
  const maxScroll = Math.max(0, entries.length - VISIBLE_ROWS);
  const scrollRow = Math.min(targetScrollRow, maxScroll);
  const scrollY = scrollRow * ROW_HEIGHT;

  // Animated counters
  const commitCount = Math.floor(
    interpolate(frame, [0, durationInFrames], [0, totalCommits], {
      extrapolateRight: "clamp",
    })
  );

  // Commit message lookup
  const commitMsg = commits?.find(
    (c) => c.sha === currentKf.commitSha
  )?.message;
  const truncatedMsg = commitMsg
    ? (commitMsg.split("\n")[0]?.slice(0, COMMIT_MSG_MAX_LEN) ?? "")
    : "";
  const msgOpacity = interpolate(
    localFrame,
    [0, 4, segmentFrames * 0.7, segmentFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      {/* File tree area */}
      <div
        style={{
          position: "absolute",
          top: TOP_PADDING,
          left: 0,
          right: 0,
          height: VISIBLE_HEIGHT,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            transform: `translateY(-${scrollY}px)`,
            transition: "transform 0.3s ease-out",
          }}
        >
          {entries.map((entry, i) => (
            <FileRow
              entry={entry}
              fps={fps}
              isModified={modifiedEntryIndices.has(i)}
              isNew={newEntryIndices.has(i)}
              key={entry.path}
              localFrame={localFrame}
              segmentFrames={segmentFrames}
              staggerIndex={[...newEntryIndices].indexOf(i)}
            />
          ))}
        </div>
      </div>

      {/* Date overlay */}
      <div
        style={{
          position: "absolute",
          top: TOP_PADDING + VISIBLE_HEIGHT + 20,
          left: 0,
          width: "100%",
        }}
      >
        <DateOverlay date={currentKf.date} />
      </div>

      {/* Commit message flash */}
      {truncatedMsg && (
        <div
          style={{
            position: "absolute",
            top: TOP_PADDING + VISIBLE_HEIGHT + 60,
            left: 40,
            right: 40,
            opacity: msgOpacity,
            fontFamily: "monospace",
            fontSize: 18,
            color: "rgba(255,255,255,0.55)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          {truncatedMsg}
        </div>
      )}

      {/* Bottom stats */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            color: "white",
            fontFamily: "monospace",
            fontSize: 40,
            fontWeight: "bold",
          }}
        >
          {commitCount.toLocaleString()} commits
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "monospace",
            fontSize: 20,
          }}
        >
          {entries.filter((e) => !e.isDir).length} files
        </span>
      </div>
    </AbsoluteFill>
  );
}

function FileRow({
  entry,
  isNew,
  isModified,
  localFrame,
  segmentFrames,
  staggerIndex,
  fps,
}: {
  entry: FlatFileEntry;
  fps: number;
  isModified: boolean;
  isNew: boolean;
  localFrame: number;
  segmentFrames: number;
  staggerIndex: number;
}) {
  const delay = isNew ? Math.max(0, staggerIndex) * 2 : 0;

  const slideIn = isNew
    ? spring({
        frame: localFrame,
        fps,
        delay,
        from: 0,
        to: 1,
        config: { damping: 12, mass: 0.5, stiffness: 180 },
      })
    : 1;

  const translateX = interpolate(slideIn, [0, 1], [30, 0]);
  const opacity = slideIn;

  const greenHighlight = isNew
    ? interpolate(localFrame - delay, [0, 5, 15], [0, 0.2, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const yellowHighlight = isModified
    ? interpolate(localFrame, [0, 5, 20], [0, 0.25, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const highlightOpacity = greenHighlight + yellowHighlight;
  const highlightColor =
    yellowHighlight > 0
      ? `rgba(227, 179, 23, ${yellowHighlight})`
      : `rgba(63, 185, 80, ${greenHighlight})`;

  // Heatmap gutter color
  let gutterColor = "rgba(255,255,255,0.06)";
  if (isNew) {
    const a = interpolate(
      localFrame - delay,
      [0, 5, segmentFrames],
      [0, 0.9, 0.15],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    gutterColor = `rgba(63, 185, 80, ${a})`;
  } else if (isModified) {
    const a = interpolate(localFrame, [0, 5, segmentFrames], [0, 0.9, 0.15], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    gutterColor = `rgba(227, 179, 23, ${a})`;
  }

  return (
    <div
      style={{
        height: ROW_HEIGHT,
        display: "flex",
        alignItems: "center",
        paddingLeft: entry.depth * INDENT_PX + 16,
        opacity,
        transform: `translateX(${translateX}px)`,
        position: "relative",
      }}
    >
      {/* Heatmap gutter bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1,
          bottom: 1,
          width: GUTTER_WIDTH,
          backgroundColor: gutterColor,
          borderRadius: 1,
        }}
      />

      {/* Highlight for new (green) or modified (yellow) files */}
      {highlightOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: highlightColor,
            borderRadius: 4,
          }}
        />
      )}

      {/* Icon */}
      <span
        style={{
          width: 20,
          fontSize: 14,
          color: entry.isDir ? "rgba(255,255,255,0.5)" : entry.color,
          marginRight: 8,
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        {entry.isDir ? ">" : "\u25CF"}
      </span>

      {/* Name */}
      <span
        style={{
          fontSize: FONT_SIZE,
          fontFamily: "monospace",
          color: entry.isDir
            ? "rgba(255,255,255,0.7)"
            : "rgba(255,255,255,0.9)",
          fontWeight: entry.isDir ? "bold" : "normal",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.name}
      </span>

      {/* Language tag for files */}
      {!entry.isDir && entry.language && (
        <span
          style={{
            marginLeft: 12,
            fontSize: 13,
            color: entry.color,
            fontFamily: "monospace",
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          {entry.language}
        </span>
      )}
    </div>
  );
}
