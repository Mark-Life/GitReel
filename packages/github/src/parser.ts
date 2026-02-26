import { Effect } from "effect";
import { InvalidRepoUrl } from "./errors.js";

const URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/;

const SLUG_REGEX = /^([^/]+)\/([^/]+)$/;

/** Parses a GitHub repo URL or owner/repo slug into owner + repo */
export const parseRepoUrl = Effect.fn("parseRepoUrl")(function* (
  input: string
) {
  const trimmed = input.trim();

  const urlMatch = URL_REGEX.exec(trimmed);
  if (urlMatch?.[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const slugMatch = SLUG_REGEX.exec(trimmed);
  if (slugMatch?.[1] && slugMatch[2]) {
    return { owner: slugMatch[1], repo: slugMatch[2] };
  }

  return yield* new InvalidRepoUrl({ input });
});
