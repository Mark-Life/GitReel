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
import { DateOverlay } from "../components/date-overlay";
import type { FileTreeTimelapseProps } from "../types";

const ROW_HEIGHT = 38;
const INDENT_PX = 28;
const FONT_SIZE = 22;
const VISIBLE_ROWS = 36;
const VISIBLE_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT;
const TOP_PADDING = 80;

/** Compute which keyframe index and local progress for a frame */
const getKeyframeAt = (
  frame: number,
  keyframeCount: number,
  totalFrames: number
) => {
  if (keyframeCount <= 1) {
    return { index: 0, t: 0 };
  }
  const segments = keyframeCount - 1;
  const framesPerSegment = totalFrames / segments;
  const segment = Math.min(Math.floor(frame / framesPerSegment), segments - 1);
  const t = Math.max(
    0,
    Math.min(1, (frame - segment * framesPerSegment) / framesPerSegment)
  );
  return { index: segment, t };
};

/** VS Code-style file tree timelapse — files appear as the repo grows */
export function FileTreeTimelapse({
  keyframes,
  totalCommits,
}: FileTreeTimelapseProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const { index: kfIndex } = getKeyframeAt(
    frame,
    keyframes.length,
    durationInFrames
  );

  const currentKf = keyframes[kfIndex];
  if (!currentKf) {
    return <AbsoluteFill style={{ backgroundColor: "#0d1117" }} />;
  }

  const prevKf = kfIndex > 0 ? keyframes[kfIndex - 1] : null;

  const tree = buildFileTree(currentKf.rects);
  const entries = flattenTree(tree, 5);

  const newPaths = prevKf
    ? diffFileSets(prevKf.rects, currentKf.rects).added
    : new Set(currentKf.rects.map((r) => r.id));

  const newEntryIndices = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry && !entry.isDir && newPaths.has(entry.path)) {
      newEntryIndices.add(i);
    }
  }

  // Auto-scroll to show new files
  const firstNewIndex = [...newEntryIndices][0] ?? 0;
  const targetScrollRow = Math.max(0, firstNewIndex - 4);
  const maxScroll = Math.max(0, entries.length - VISIBLE_ROWS);
  const scrollRow = Math.min(targetScrollRow, maxScroll);
  const scrollY = scrollRow * ROW_HEIGHT;

  // Segment local frame for staggered animations
  const segments = Math.max(keyframes.length - 1, 1);
  const framesPerSegment = durationInFrames / segments;
  const localFrame = frame - kfIndex * framesPerSegment;

  const commitCount = Math.floor(
    interpolate(frame, [0, durationInFrames], [0, totalCommits], {
      extrapolateRight: "clamp",
    })
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      {/* Left gutter line */}
      <div
        style={{
          position: "absolute",
          top: TOP_PADDING,
          left: 38,
          width: 2,
          height: VISIBLE_HEIGHT,
          backgroundColor: "rgba(255,255,255,0.06)",
        }}
      />

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
              isNew={newEntryIndices.has(i)}
              key={entry.path}
              localFrame={localFrame}
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
  localFrame,
  staggerIndex,
  fps,
}: {
  entry: FlatFileEntry;
  fps: number;
  isNew: boolean;
  localFrame: number;
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

  const highlightOpacity = isNew
    ? interpolate(localFrame - delay, [0, 5, 15], [0, 0.2, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        height: ROW_HEIGHT,
        display: "flex",
        alignItems: "center",
        paddingLeft: entry.depth * INDENT_PX + 12,
        opacity,
        transform: `translateX(${translateX}px)`,
        position: "relative",
      }}
    >
      {/* Green highlight for new files */}
      {highlightOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(63, 185, 80, ${highlightOpacity})`,
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
