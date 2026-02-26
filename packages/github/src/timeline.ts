import { Effect } from "effect";
import { fetchCommits } from "./fetchers/commits.js";
import { fetchContributors } from "./fetchers/contributors.js";
import { fetchLanguages } from "./fetchers/languages.js";
import { fetchRepo } from "./fetchers/repo.js";
import { fetchTree } from "./fetchers/trees.js";
import { parseRepoUrl } from "./parser.js";
import { sampleCommits } from "./sampling.js";
import { RepoTimeline } from "./types.js";

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
