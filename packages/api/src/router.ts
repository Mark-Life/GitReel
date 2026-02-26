import { ORPCError, os } from "@orpc/server";
import { fetchRepoTimeline, OctokitClient } from "@workspace/github";
import { Effect, Either } from "effect";
import { z } from "zod";

const health = {
  check: os.handler(async () => ({ status: "ok" as const })),
};

const throwMappedError = (error: { readonly _tag: string }): never => {
  const e = error as Record<string, unknown>;
  switch (error._tag) {
    case "RepoNotFound":
      throw new ORPCError("NOT_FOUND", {
        message: `Repository ${e.owner}/${e.repo} not found`,
      });
    case "RateLimited":
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "GitHub API rate limit exceeded",
      });
    case "InvalidRepoUrl":
      throw new ORPCError("BAD_REQUEST", {
        message: `Invalid repository URL: ${e.input}`,
      });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: typeof e.message === "string" ? e.message : "Unknown error",
      });
  }
};

const github = {
  getTimeline: os
    .input(z.object({ url: z.string().min(1) }))
    .handler(async ({ input }) => {
      const program = fetchRepoTimeline(input.url).pipe(
        Effect.provide(OctokitClient.Default)
      );
      const result = await Effect.runPromise(Effect.either(program));

      return Either.match(result, {
        onLeft: (error) => throwMappedError(error),
        onRight: (timeline) => timeline,
      });
    }),
};

export const router = {
  health,
  github,
};

export type Router = typeof router;
