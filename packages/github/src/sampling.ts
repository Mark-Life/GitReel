import type { TimelineCommit } from "./types";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const MS_PER_SECOND = 1000;
const DAY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const WEEK_MS = DAYS_PER_WEEK * DAY_MS;
const SMALL_THRESHOLD = 100;
const MEDIUM_THRESHOLD = 500;
const LARGE_THRESHOLD = 5000;
const TARGET_KEYFRAMES = 50;

/**
 * Samples commits for tree fetching to keep keyframe count manageable.
 * Input: newest-first. Output: newest-first.
 * Always includes first (newest) and last (oldest) commit.
 */
export const sampleCommits = (
  commits: readonly TimelineCommit[]
): TimelineCommit[] => {
  const count = commits.length;
  const first = commits[0];
  const last = commits[count - 1];
  if (!(first && last)) {
    return [];
  }
  if (count < SMALL_THRESHOLD) {
    return [...commits];
  }

  if (count <= MEDIUM_THRESHOLD) {
    const step = Math.ceil(count / TARGET_KEYFRAMES);
    const sampled: TimelineCommit[] = [];
    for (let i = 0; i < count; i++) {
      const commit = commits[i];
      if (i % step === 0 && commit) {
        sampled.push(commit);
      }
    }
    if (sampled.at(-1) !== last) {
      sampled.push(last);
    }
    return sampled;
  }

  // 500-5k: 1/day, 5k+: 1/week
  const intervalMs = count > LARGE_THRESHOLD ? WEEK_MS : DAY_MS;

  const sampled: TimelineCommit[] = [first];
  let lastTime = new Date(first.date).getTime();

  for (let i = 1; i < count - 1; i++) {
    const commit = commits[i];
    if (!commit) {
      continue;
    }
    const time = new Date(commit.date).getTime();
    if (lastTime - time >= intervalMs) {
      sampled.push(commit);
      lastTime = time;
    }
  }

  if (sampled.at(-1) !== last) {
    sampled.push(last);
  }

  return sampled;
};
