import type { TreemapKeyframe, TreemapRect } from "../video/types";

/** POJO mirror of RepoMeta (no Effect Schema classes) */
export interface VideoRepoMeta {
  createdAt: string;
  defaultBranch: string;
  description: string | null;
  forks: number;
  fullName: string;
  name: string;
  owner: string;
  stars: number;
}

/** POJO mirror of CommitAuthor */
export interface VideoCommitAuthor {
  avatarUrl: string | null;
  login: string | null;
  name: string;
}

/** POJO mirror of TimelineCommit */
export interface VideoTimelineCommit {
  author: VideoCommitAuthor;
  date: string;
  message: string;
  sha: string;
}

/** POJO mirror of Contributor */
export interface VideoContributor {
  avatarUrl: string;
  contributions: number;
  login: string;
}

/** Serializable mirror of RepoTimeline for Remotion inputProps */
export interface VideoTimeline {
  commits: VideoTimelineCommit[];
  contributors: VideoContributor[];
  languages: Record<string, number>;
  meta: VideoRepoMeta;
  repoAgeYears: number;
  totalCommits: number;
}

/** Video output configuration */
export interface VideoConfig {
  durationInFrames: number;
  fps: number;
  height: number;
  width: number;
}

/** Frame range for a single scene */
export interface SceneTiming {
  durationInFrames: number;
  from: number;
}

/** Timing for all scenes */
export interface SceneTimings {
  outro: SceneTiming;
  stats: SceneTiming;
  timelapse: SceneTiming;
  title: SceneTiming;
}

export interface TitleCardProps {
  contributorCount: number;
  meta: VideoRepoMeta;
  totalCommits: number;
}

export interface TimelapseProps {
  commits: VideoTimelineCommit[];
  keyframes: TreemapKeyframe[];
  totalCommits: number;
  treemapHeight: number;
  treemapWidth: number;
}

export interface StatsExplosionProps {
  contributors: VideoContributor[];
  keyframes: TreemapKeyframe[];
  languages: Record<string, number>;
  meta: VideoRepoMeta;
  repoAgeYears: number;
  totalCommits: number;
  treemapHeight: number;
  treemapWidth: number;
}

export interface OutroProps {
  contributorCount: number;
  repoAgeYears: number;
}

export interface LanguagePieProps {
  languages: Record<string, number>;
}

export interface ContributorGridProps {
  contributors: VideoContributor[];
}

export interface PulseRingProps {
  commits: VideoTimelineCommit[];
}

export interface CodeRainProps {
  commits: VideoTimelineCommit[];
}

/** Master composition inputProps */
export interface GitReelProps {
  keyframes: TreemapKeyframe[];
  timeline: VideoTimeline;
}

/* ── Hype composition types ─────────────────────────────── */

export interface HypeTitleProps {
  meta: VideoRepoMeta;
}

export interface NumberSlamProps {
  contributorCount: number;
  linesOfCode?: number;
  stars: number;
  totalCommits: number;
}

export interface BeforeAfterProps {
  firstRects: TreemapRect[];
  lastRects: TreemapRect[];
  treemapHeight: number;
  treemapWidth: number;
}

export interface BossEntryProps {
  contributors: VideoContributor[];
}

export interface WrappedCardProps {
  timeline: VideoTimeline;
}

export interface HypeOutroProps {
  repoName: string;
}

export interface GlitchTransitionProps {
  durationInFrames: number;
}

export interface FileTreeTimelapseProps {
  keyframes: TreemapKeyframe[];
  totalCommits: number;
}

export interface DiffStatsProps {
  commits: VideoTimelineCommit[];
  keyframes: TreemapKeyframe[];
}

export interface HypeSceneTimings {
  boss: SceneTiming;
  diffStats: SceneTiming;
  grid: SceneTiming;
  numbers: SceneTiming;
  outro: SceneTiming;
  timelapse: SceneTiming;
  title: SceneTiming;
  wrapped: SceneTiming;
}
