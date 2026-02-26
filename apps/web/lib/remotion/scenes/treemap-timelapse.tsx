"use client";

import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getFrameData } from "../../video/interpolation";
import { AvatarPopup } from "../components/avatar-popup";
import { DateOverlay } from "../components/date-overlay";
import { TreemapCanvas } from "../components/treemap-canvas";
import type { TimelapseProps, VideoTimelineCommit } from "../types";

/** Build a lookup from commitSha → author info */
const buildAuthorMap = (commits: VideoTimelineCommit[]) => {
  const map = new Map<string, VideoTimelineCommit["author"]>();
  for (const c of commits) {
    map.set(c.sha, c.author);
  }
  return map;
};

/** Main timelapse scene — animated treemap with overlays */
export function TreemapTimelapse({
  keyframes,
  commits,
  totalCommits,
  treemapWidth,
  treemapHeight,
}: TimelapseProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const { rects, keyframeIndex } = getFrameData(
    frame,
    keyframes,
    durationInFrames
  );

  const currentKeyframe = keyframes[keyframeIndex];
  const currentDate = currentKeyframe?.date ?? "";

  const commitCount = Math.floor(
    interpolate(frame, [0, durationInFrames], [0, totalCommits], {
      extrapolateRight: "clamp",
    })
  );

  const authorMap = buildAuthorMap(commits);
  const segments = Math.max(keyframes.length - 1, 1);
  const framesPerSegment = durationInFrames / segments;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      {/* Treemap — top 60% */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <TreemapCanvas
          height={treemapHeight}
          rects={rects}
          width={treemapWidth}
        />
        <DateOverlay date={currentDate} />
      </div>

      {/* Avatar popups per keyframe transition */}
      {keyframes.map((kf, i) => {
        if (i === 0) {
          return null;
        }
        const author = authorMap.get(kf.commitSha);
        if (!author) {
          return null;
        }
        const segmentStart = Math.round((i - 1) * framesPerSegment);
        const segmentDuration = Math.round(framesPerSegment);

        return (
          <Sequence
            durationInFrames={Math.min(segmentDuration, 45)}
            from={segmentStart}
            key={kf.commitSha}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: treemapWidth,
                height: treemapHeight,
              }}
            >
              <AvatarPopup avatarUrl={author.avatarUrl} name={author.name} />
            </div>
          </Sequence>
        );
      })}

      {/* Bottom overlay — stats */}
      <div
        style={{
          position: "absolute",
          top: treemapHeight,
          left: 0,
          width: treemapWidth,
          height: 1920 - treemapHeight,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
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
            color: "rgba(255,255,255,0.5)",
            fontFamily: "monospace",
            fontSize: 18,
          }}
        >
          {keyframeIndex + 1} / {keyframes.length} snapshots
        </span>
      </div>
    </AbsoluteFill>
  );
}
