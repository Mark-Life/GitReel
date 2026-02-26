"use client";

import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TreemapCanvas } from "../components/treemap-canvas";
import type { StatsExplosionProps } from "../types";

const CARD_BG = "rgba(255,255,255,0.08)";
const CARD_RADIUS = 12;
const STAGGER_DELAY = 6;

interface StatCardProps {
  index: number;
  label: string;
  value: string;
}

/** Single stat card with staggered spring-in */
function StatCard({ label, value, index }: StatCardProps) {
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
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
        minWidth: 140,
      }}
    >
      <span
        style={{
          color: "white",
          fontFamily: "monospace",
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        {value}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.6)",
          fontFamily: "monospace",
          fontSize: 13,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Get top N languages sorted by byte count */
const getTopLanguages = (languages: Record<string, number>, n: number) =>
  Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name]) => name);

/** Stats explosion scene — final treemap + stat cards */
export function StatsExplosion({
  keyframes,
  meta,
  totalCommits,
  contributors,
  languages,
  repoAgeYears,
  treemapWidth,
  treemapHeight,
}: StatsExplosionProps) {
  const lastKeyframe = keyframes.at(-1);
  const finalRects = lastKeyframe?.rects ?? [];
  const topLangs = getTopLanguages(languages, 3);
  const scaledTreemapH = treemapHeight * 0.55;
  const scaledTreemapW = treemapWidth * 0.55;
  const offsetX = (treemapWidth - scaledTreemapW) / 2;

  const yearsText =
    repoAgeYears < 1 ? "<1 year" : `${Math.round(repoAgeYears)}y`;

  const stats = [
    { label: "commits", value: totalCommits.toLocaleString() },
    { label: "contributors", value: contributors.length.toLocaleString() },
    { label: "stars", value: meta.stars.toLocaleString() },
    { label: "top languages", value: topLangs.join(", ") || "—" },
    { label: "repo age", value: yearsText },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      {/* Scaled-down final treemap */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: offsetX,
          transform: `scale(${0.55})`,
          transformOrigin: "top left",
        }}
      >
        <TreemapCanvas
          height={treemapHeight}
          rects={finalRects}
          width={treemapWidth}
        />
      </div>

      {/* Stat cards below treemap */}
      <div
        style={{
          position: "absolute",
          top: 80 + scaledTreemapH + 40,
          left: 0,
          width: treemapWidth,
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          padding: "0 40px",
        }}
      >
        {stats.map((s, i) => (
          <StatCard index={i} key={s.label} label={s.label} value={s.value} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
