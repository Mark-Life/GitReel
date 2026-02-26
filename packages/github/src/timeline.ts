import { Effect } from "effect";
import { fetchCommits } from "./fetchers/commits";
import { fetchContributors } from "./fetchers/contributors";
import { fetchLanguages } from "./fetchers/languages";
import { fetchRepo } from "./fetchers/repo";
import { fetchTree } from "./fetchers/trees";
import { parseRepoUrl } from "./parser";
import { sampleCommits } from "./sampling";
import { RepoTimeline } from "./types";

/** Fetches all data for a repo and assembles a RepoTimeline */
export const fetchRepoTimeline = Effect.fn("fetchRepoTimeline")(function* (
  input: string
) {
  const { owner, repo } = yield* parseRepoUrl(input);

  const [meta, allCommits, languages, contributors] = yield* Effect.all(
    [
      fetchRepo(owner, repo),
      fetchCommits(owner, repo),
      fetchLanguages(owner, repo),
      fetchContributors(owner, repo),
    ],
    { concurrency: "unbounded" }
  );

  const keyframes = sampleCommits(allCommits);

  const snapshots = yield* Effect.forEach(
    keyframes,
    (commit) => fetchTree(owner, repo, commit),
    { concurrency: 5 }
  );

  return new RepoTimeline({
    meta,
    commits: allCommits,
    snapshots,
    languages,
    contributors,
    fetchedAt: new Date().toISOString(),
  });
});
