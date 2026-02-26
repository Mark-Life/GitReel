import type { RepoTimeline } from "@workspace/github";
import type { VideoTimeline } from "./types";

const DAYS_PER_YEAR = 365.25;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLIS_PER_SECOND = 1000;
const MILLIS_PER_YEAR =
  DAYS_PER_YEAR *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLIS_PER_SECOND;

/** Compute repo age in whole years from createdAt ISO string to now */
const computeRepoAgeYears = (createdAt: string) =>
  Math.max(
    1,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / MILLIS_PER_YEAR)
  );

/** Map oRPC RepoTimeline response → serializable VideoTimeline for Remotion */
export const toVideoTimeline = (repo: RepoTimeline): VideoTimeline => ({
  meta: {
    owner: repo.meta.owner,
    name: repo.meta.name,
    fullName: repo.meta.fullName,
    description: repo.meta.description,
    stars: repo.meta.stars,
    forks: repo.meta.forks,
    defaultBranch: repo.meta.defaultBranch,
    createdAt: repo.meta.createdAt,
  },
  commits: repo.commits.map((c) => ({
    sha: c.sha,
    message: c.message,
    author: {
      name: c.author.name,
      login: c.author.login,
      avatarUrl: c.author.avatarUrl,
    },
    date: c.date,
  })),
  languages: { ...repo.languages },
  contributors: repo.contributors.map((c) => ({
    login: c.login,
    avatarUrl: c.avatarUrl,
    contributions: c.contributions,
  })),
  totalCommits: repo.commits.length,
  repoAgeYears: computeRepoAgeYears(repo.meta.createdAt),
});
