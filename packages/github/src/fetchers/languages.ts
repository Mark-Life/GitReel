import { Effect } from "effect";
import { OctokitClient } from "../client";
import { mapOctokitError } from "../errors";
import type { LanguageBreakdown } from "../types";

/** Fetches language breakdown (bytes per language) */
export const fetchLanguages = Effect.fn("fetchLanguages")(function* (
  owner: string,
  repo: string
) {
  const client = yield* OctokitClient;
  const response = yield* client
    .use((c) => c.rest.repos.listLanguages({ owner, repo }))
    .pipe(Effect.mapError((e) => mapOctokitError(e.cause, owner, repo)));

  return response.data as LanguageBreakdown;
});
