import { Schema } from "effect";

export class RepoNotFound extends Schema.TaggedError<RepoNotFound>()(
  "RepoNotFound",
  { owner: Schema.String, repo: Schema.String }
) {}

export class RateLimited extends Schema.TaggedError<RateLimited>()(
  "RateLimited",
  { retryAfter: Schema.NullOr(Schema.String) }
) {}

export class GitHubApiError extends Schema.TaggedError<GitHubApiError>()(
  "GitHubApiError",
  { status: Schema.Number, message: Schema.String }
) {}

export class InvalidRepoUrl extends Schema.TaggedError<InvalidRepoUrl>()(
  "InvalidRepoUrl",
  { input: Schema.String }
) {}

const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY = 429;
const HTTP_INTERNAL = 500;

/** Maps raw Octokit errors to domain error types */
export const mapOctokitError = (e: unknown, owner: string, repo: string) => {
  if (typeof e === "object" && e !== null && "status" in e) {
    const err = e as {
      status: number;
      message?: string;
      response?: { headers?: Record<string, string> };
    };
    if (err.status === HTTP_NOT_FOUND) {
      return new RepoNotFound({ owner, repo });
    }
    if (
      (err.status === HTTP_FORBIDDEN || err.status === HTTP_TOO_MANY) &&
      err.response?.headers?.["x-ratelimit-remaining"] === "0"
    ) {
      return new RateLimited({
        retryAfter: err.response?.headers?.["retry-after"] ?? null,
      });
    }
    return new GitHubApiError({
      status: err.status,
      message: err.message ?? "Unknown GitHub API error",
    });
  }
  return new GitHubApiError({ status: HTTP_INTERNAL, message: String(e) });
};
