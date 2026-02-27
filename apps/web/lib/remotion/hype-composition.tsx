"use client";

import { useMemo } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { GlitchTransition } from "./effects/glitch-transition";
import { computeHypeConfig, GLITCH_FRAMES } from "./hype-config";
import { BossEntry } from "./scenes/boss-entry";
import { ContributorGrid } from "./scenes/contributor-grid";
import { DiffStats } from "./scenes/diff-stats";
import { FileTreeTimelapse } from "./scenes/file-tree-timelapse";
import { HypeOutro } from "./scenes/hype-outro";
import { HypeTitle } from "./scenes/hype-title";
import { NumberSlam } from "./scenes/number-slam";
import { WrappedCard } from "./scenes/wrapped-card";
import type { GitReelProps } from "./types";

/** Hype-style GitReel composition — TikTok energy sequence */
export function HypeComposition({
  timeline,
  keyframes,
  timings: precomputedTimings,
}: GitReelProps) {
  const timings = useMemo(
    () => precomputedTimings ?? computeHypeConfig(timeline, keyframes).timings,
    [precomputedTimings, timeline, keyframes]
  );

  const fps = 30;

  const scenes = [
    timings.title,
    timings.numbers,
    timings.diffStats,
    timings.timelapse,
    timings.boss,
    timings.grid,
    timings.wrapped,
    timings.outro,
  ];

  return (
    <AbsoluteFill>
      {/* Title slam */}
      <Sequence
        durationInFrames={timings.title.durationInFrames}
        from={timings.title.from}
        premountFor={fps}
      >
        <HypeTitle meta={timeline.meta} />
      </Sequence>

      {/* Number slam counters */}
      <Sequence
        durationInFrames={timings.numbers.durationInFrames}
        from={timings.numbers.from}
        premountFor={fps}
      >
        <NumberSlam
          contributorCount={timeline.contributors.length}
          stars={timeline.meta.stars}
          totalCommits={timeline.totalCommits}
        />
      </Sequence>

      {/* Diff stats — significant commits */}
      <Sequence
        durationInFrames={timings.diffStats.durationInFrames}
        from={timings.diffStats.from}
        premountFor={fps}
      >
        <DiffStats commits={timeline.commits} keyframes={keyframes} />
      </Sequence>

      {/* File tree timelapse */}
      <Sequence
        durationInFrames={timings.timelapse.durationInFrames}
        from={timings.timelapse.from}
        premountFor={fps}
      >
        <FileTreeTimelapse
          commits={timeline.commits}
          keyframes={keyframes}
          totalCommits={timeline.totalCommits}
        />
      </Sequence>

      {/* Boss entry — top 3 */}
      <Sequence
        durationInFrames={timings.boss.durationInFrames}
        from={timings.boss.from}
        premountFor={fps}
      >
        <BossEntry contributors={timeline.contributors} />
      </Sequence>

      {/* Contributor grid — everyone */}
      <Sequence
        durationInFrames={timings.grid.durationInFrames}
        from={timings.grid.from}
        premountFor={fps}
      >
        <ContributorGrid contributors={timeline.contributors} />
      </Sequence>

      {/* Wrapped card */}
      <Sequence
        durationInFrames={timings.wrapped.durationInFrames}
        from={timings.wrapped.from}
        premountFor={fps}
      >
        <WrappedCard timeline={timeline} />
      </Sequence>

      {/* Outro */}
      <Sequence
        durationInFrames={timings.outro.durationInFrames}
        from={timings.outro.from}
        premountFor={fps}
      >
        <HypeOutro repoName={timeline.meta.fullName} />
      </Sequence>

      {/* Glitch transition overlays between scenes */}
      {scenes.slice(0, -1).map((scene, i) => {
        const glitchFrom =
          scene.from + scene.durationInFrames - Math.floor(GLITCH_FRAMES / 2);
        return (
          <Sequence
            durationInFrames={GLITCH_FRAMES}
            from={glitchFrom}
            key={`glitch-${i.toString()}`}
          >
            <GlitchTransition durationInFrames={GLITCH_FRAMES} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
