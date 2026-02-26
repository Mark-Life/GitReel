import type { TreemapKeyframe } from "../video/types";

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

/** Master composition inputProps */
export interface GitReelProps {
  keyframes: TreemapKeyframe[];
  timeline: VideoTimeline;
}
