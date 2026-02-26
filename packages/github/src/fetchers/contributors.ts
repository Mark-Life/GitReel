import { Effect } from "effect";
import { OctokitClient } from "../client.js";
import { mapOctokitError } from "../errors.js";
import type { GitHubLogin } from "../types.js";
import { Contributor } from "../types.js";

const MAX_CONTRIBUTORS = 200;
const MAX_PAGES = 2;

/** Fetches top contributors. Returns [] for repos with 500+ contributors (204). */
export const fetchContributors = Effect.fn("fetchContributors")(function* (
  owner: string,
  repo: string
) {
  const client = yield* OctokitClient;
  const raw = yield* client
    .use(async (c) => {
      try {
        let page = 0;
        return await c.paginate(
          c.rest.repos.listContributors,
          { owner, repo, per_page: 100 },
          (response, done) => {
            page++;
            if (page >= MAX_PAGES) {
              done();
            }
            return response.data;
          }
        );
      } catch {
        // 204 No Content for repos with anonymous/too many contributors
        return [];
      }
    })
    .pipe(Effect.mapError((e) => mapOctokitError(e.cause, owner, repo)));

  return raw.slice(0, MAX_CONTRIBUTORS).map(
    (c) =>
      new Contributor({
        login: (c.login ?? "unknown") as GitHubLogin,
        avatarUrl: c.avatar_url ?? "",
        contributions: c.contributions ?? 0,
      })
  );
});
