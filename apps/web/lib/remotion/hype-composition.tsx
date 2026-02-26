"use client";

import { AbsoluteFill, Sequence } from "remotion";
import { GlitchTransition } from "./effects/glitch-transition";
import { computeHypeConfig, GLITCH_FRAMES } from "./hype-config";
import { BeforeAfter } from "./scenes/before-after";
import { BossEntry } from "./scenes/boss-entry";
import { HypeOutro } from "./scenes/hype-outro";
import { HypeTitle } from "./scenes/hype-title";
import { NumberSlam } from "./scenes/number-slam";
import { TreemapTimelapse } from "./scenes/treemap-timelapse";
import { WrappedCard } from "./scenes/wrapped-card";
import type { GitReelProps } from "./types";

/** Hype-style GitReel composition — TikTok energy sequence */
export function HypeComposition({ timeline, keyframes }: GitReelProps) {
  const { timings, treemapWidth, treemapHeight } = computeHypeConfig(
    timeline,
    keyframes
  );

  const fps = 30;
  const firstRects = keyframes[0]?.rects ?? [];
  const lastRects = keyframes.at(-1)?.rects ?? [];

  const scenes = [
    timings.title,
    timings.numbers,
    timings.beforeAfter,
    timings.timelapse,
    timings.boss,
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

      {/* Before/After treemap */}
      <Sequence
        durationInFrames={timings.beforeAfter.durationInFrames}
        from={timings.beforeAfter.from}
        premountFor={fps}
      >
        <BeforeAfter
          firstRects={firstRects}
          lastRects={lastRects}
          treemapHeight={treemapHeight}
          treemapWidth={treemapWidth}
        />
      </Sequence>

      {/* Timelapse */}
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

      {/* Boss entry */}
      <Sequence
        durationInFrames={timings.boss.durationInFrames}
        from={timings.boss.from}
        premountFor={fps}
      >
        <BossEntry contributors={timeline.contributors} />
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
