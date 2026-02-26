import { Effect } from "effect";
import { OctokitClient } from "../client.js";
import { mapOctokitError } from "../errors.js";
import { RepoMeta } from "../types.js";

/** Fetches repository metadata */
export const fetchRepo = Effect.fn("fetchRepo")(function* (
  owner: string,
  repo: string
) {
  const client = yield* OctokitClient;
  const response = yield* client
    .use((c) => c.rest.repos.get({ owner, repo }))
    .pipe(Effect.mapError((e) => mapOctokitError(e.cause, owner, repo)));

  const d = response.data;
  return new RepoMeta({
    owner: d.owner.login,
    name: d.name,
    fullName: d.full_name,
    description: d.description ?? null,
    stars: d.stargazers_count,
    forks: d.forks_count,
    defaultBranch: d.default_branch,
    createdAt: d.created_at,
  });
});
