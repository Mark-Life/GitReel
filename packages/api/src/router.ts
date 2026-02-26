import { ORPCError, os } from "@orpc/server";
import { fetchRepoTimeline, OctokitClient } from "@workspace/github";
import { Effect } from "effect";
import { z } from "zod";

const health = {
  check: os.handler(async () => ({ status: "ok" as const })),
};

const github = {
  getTimeline: os
    .input(z.object({ url: z.string().min(1) }))
    .handler(({ input }) => {
      const program = fetchRepoTimeline(input.url).pipe(
        Effect.catchTags({
          RepoNotFound: (e) =>
            Effect.fail(
              new ORPCError("NOT_FOUND", {
                message: `Repository ${e.owner}/${e.repo} not found`,
              })
            ),
          RateLimited: () =>
            Effect.fail(
              new ORPCError("TOO_MANY_REQUESTS", {
                message: "GitHub API rate limit exceeded",
              })
            ),
          GitHubApiError: (e) =>
            Effect.fail(
              new ORPCError("INTERNAL_SERVER_ERROR", {
                message: e.message,
              })
            ),
          InvalidRepoUrl: (e) =>
            Effect.fail(
              new ORPCError("BAD_REQUEST", {
                message: `Invalid repository URL: ${e.input}`,
              })
            ),
        }),
        Effect.provide(OctokitClient.Default)
      );
      return Effect.runPromise(program);
    }),
};

export const router = {
  health,
  github,
};

export type Router = typeof router;
