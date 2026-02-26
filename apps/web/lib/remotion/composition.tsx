"use client";

import { AbsoluteFill, Sequence } from "remotion";
import { computeVideoConfig } from "./config";
import { Outro } from "./scenes/outro";
import { StatsExplosion } from "./scenes/stats-explosion";
import { TitleCard } from "./scenes/title-card";
import { TreemapTimelapse } from "./scenes/treemap-timelapse";
import type { GitReelProps } from "./types";

/** Master GitReel composition — sequences all 4 scenes */
export function GitReelComposition({ timeline, keyframes }: GitReelProps) {
  const { timings, treemapWidth, treemapHeight } = computeVideoConfig(
    timeline,
    keyframes
  );
  const { fps } = { fps: 30 };

  return (
    <AbsoluteFill>
      <Sequence
        durationInFrames={timings.title.durationInFrames}
        from={timings.title.from}
        premountFor={fps}
      >
        <TitleCard
          contributorCount={timeline.contributors.length}
          meta={timeline.meta}
          totalCommits={timeline.totalCommits}
        />
      </Sequence>

      <Sequence
        durationInFrames={timings.timelapse.durationInFrames}
        from={timings.timelapse.from}
        premountFor={fps}
      >
        <TreemapTimelapse
          commits={timeline.commits}
          keyframes={keyframes}
          totalCommits={timeline.totalCommits}
          treemapHeight={treemapHeight}
          treemapWidth={treemapWidth}
        />
      </Sequence>

      <Sequence
        durationInFrames={timings.stats.durationInFrames}
        from={timings.stats.from}
        premountFor={fps}
      >
        <StatsExplosion
          contributors={timeline.contributors}
          keyframes={keyframes}
          languages={timeline.languages}
          meta={timeline.meta}
          repoAgeYears={timeline.repoAgeYears}
          totalCommits={timeline.totalCommits}
          treemapHeight={treemapHeight}
          treemapWidth={treemapWidth}
        />
      </Sequence>

      <Sequence
        durationInFrames={timings.outro.durationInFrames}
        from={timings.outro.from}
        premountFor={fps}
      >
        <Outro
          contributorCount={timeline.contributors.length}
          repoAgeYears={timeline.repoAgeYears}
        />
      </Sequence>
    </AbsoluteFill>
  );
}

export { computeVideoConfig } from "./config";
export type { GitReelProps, VideoConfig, VideoTimeline } from "./types";
