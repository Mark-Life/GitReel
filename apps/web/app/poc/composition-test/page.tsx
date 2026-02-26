"use client";

import { Player } from "@remotion/player";
import type { FC } from "react";
import { useMemo } from "react";
import {
  computeVideoConfig,
  GitReelComposition,
} from "../../../lib/remotion/composition";
import type { GitReelProps, VideoTimeline } from "../../../lib/remotion/types";
import type { TreemapKeyframe, TreemapRect } from "../../../lib/video/types";

// Remotion Player expects LooseComponentType<Record<string, unknown>>
// Cast required for strongly-typed props components
const CompositionComponent = GitReelComposition as unknown as FC<
  Record<string, unknown>
>;

/** Generate mock treemap rects for a snapshot */
const mockRects = (count: number, seed: number): TreemapRect[] => {
  const colors = [
    "#3178c6",
    "#f1e05a",
    "#e34c26",
    "#563d7c",
    "#89e051",
    "#dea584",
  ];
  const rects: TreemapRect[] = [];
  const cols = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const jitter = Math.sin(seed * 100 + i) * 0.01;

    rects.push({
      id: `file-${i}.ts`,
      x: col / cols + jitter,
      y: row / cols,
      w: 1 / cols - 0.01,
      h: 1 / cols - 0.01,
      color: colors[i % colors.length] ?? "#888",
      label: `file-${i}.ts`,
      language: ["TypeScript", "JavaScript", "CSS"][i % 3] ?? "TypeScript",
      opacity: 1,
    });
  }

  return rects;
};

const MOCK_DATES = [
  "2022-01-15",
  "2022-04-20",
  "2022-07-10",
  "2022-10-05",
  "2023-01-22",
  "2023-05-18",
  "2023-09-01",
  "2024-01-12",
  "2024-06-30",
  "2024-11-15",
];

/** Generate mock keyframes simulating repo growth */
const mockKeyframes = (): TreemapKeyframe[] =>
  MOCK_DATES.map((date, i) => ({
    commitSha: `abc${i}def`,
    date,
    rects: mockRects(8 + i * 3, i),
  }));

const MOCK_TIMELINE: VideoTimeline = {
  meta: {
    owner: "acme",
    name: "widget",
    fullName: "acme/widget",
    description: "A blazingly fast widget framework for the modern web",
    stars: 12_450,
    forks: 890,
    defaultBranch: "main",
    createdAt: "2022-01-01T00:00:00Z",
  },
  commits: MOCK_DATES.map((date, i) => ({
    sha: `abc${i}def`,
    message: `feat: add feature ${i}`,
    author: {
      name: ["Alice", "Bob", "Charlie", "Diana", "Eve"][i % 5] ?? "Alice",
      login: ["alice", "bob", "charlie", "diana", "eve"][i % 5] ?? "alice",
      avatarUrl: null,
    },
    date,
  })),
  languages: { TypeScript: 45_000, JavaScript: 20_000, CSS: 8000, HTML: 3000 },
  contributors: [
    { login: "alice", avatarUrl: "", contributions: 150 },
    { login: "bob", avatarUrl: "", contributions: 120 },
    { login: "charlie", avatarUrl: "", contributions: 80 },
    { login: "diana", avatarUrl: "", contributions: 45 },
    { login: "eve", avatarUrl: "", contributions: 20 },
  ],
  totalCommits: 415,
  repoAgeYears: 3,
};

export default function CompositionTestPage() {
  const keyframes = useMemo(mockKeyframes, []);

  const { config } = computeVideoConfig(MOCK_TIMELINE, keyframes);

  const inputProps: GitReelProps = {
    timeline: MOCK_TIMELINE,
    keyframes,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "white",
        fontFamily: "monospace",
        padding: 40,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        GitReel Composition Test
      </h1>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>
        Preview of the full 4-scene composition with mock data.{" "}
        {config.durationInFrames} frames @ {config.fps}fps (
        {(config.durationInFrames / config.fps).toFixed(1)}s)
      </p>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Preview</h2>
          <Player
            acknowledgeRemotionLicense
            component={CompositionComponent}
            compositionHeight={config.height}
            compositionWidth={config.width}
            controls
            durationInFrames={config.durationInFrames}
            fps={config.fps}
            inputProps={inputProps}
            loop
            style={{ width: 270, height: 480, borderRadius: 12 }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Scene Breakdown</h2>
          <div
            style={{
              padding: 16,
              backgroundColor: "#111",
              borderRadius: 8,
              fontSize: 13,
              color: "#888",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p>
              Config: {config.width}x{config.height} @ {config.fps}fps
            </p>
            <p>Total: {config.durationInFrames} frames</p>
            <p>Keyframes: {keyframes.length}</p>
            <p>Mock commits: {MOCK_TIMELINE.totalCommits}</p>
            <p>Contributors: {MOCK_TIMELINE.contributors.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
