import { Effect } from "effect";
import { OctokitClient } from "../client";
import { mapOctokitError } from "../errors";
import type { CommitSha, GitHubLogin } from "../types";
import { CommitAuthor, TimelineCommit } from "../types";

const MAX_PAGES = 50;

/** Fetches paginated commit history, capped at 5000 commits */
export const fetchCommits = Effect.fn("fetchCommits")(function* (
  owner: string,
  repo: string
) {
  const client = yield* OctokitClient;
  const raw = yield* client
    .use((c) => {
      let page = 0;
      return c.paginate(
        c.rest.repos.listCommits,
        { owner, repo, per_page: 100 },
        (response, done) => {
          page++;
          if (page >= MAX_PAGES) {
            done();
          }
          return response.data;
        }
      );
    })
    .pipe(Effect.mapError((e) => mapOctokitError(e.cause, owner, repo)));

  return raw.map(
    (c) =>
      new TimelineCommit({
        sha: c.sha as CommitSha,
        message: c.commit.message.split("\n")[0] ?? "",
        author: new CommitAuthor({
          name: c.commit.author?.name ?? "Unknown",
          login: (c.author?.login ?? null) as GitHubLogin | null,
          avatarUrl: c.author?.avatar_url ?? null,
        }),
        date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
      })
  );
});
