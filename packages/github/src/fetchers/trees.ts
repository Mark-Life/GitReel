import { Effect } from "effect";
import { OctokitClient } from "../client.js";
import { mapOctokitError } from "../errors.js";
import type { CommitSha } from "../types.js";
import { type TimelineCommit, TreeFile, TreeSnapshot } from "../types.js";

const EXT_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".cs": "C#",
  ".cpp": "C++",
  ".cc": "C++",
  ".c": "C",
  ".h": "C",
  ".hpp": "C++",
  ".swift": "Swift",
  ".m": "Objective-C",
  ".php": "PHP",
  ".r": "R",
  ".dart": "Dart",
  ".lua": "Lua",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".ps1": "PowerShell",
  ".pl": "Perl",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".erl": "Erlang",
  ".hs": "Haskell",
  ".ml": "OCaml",
  ".fs": "F#",
  ".clj": "Clojure",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".less": "Less",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".proto": "Protocol Buffers",
  ".zig": "Zig",
  ".nim": "Nim",
  ".jl": "Julia",
  ".tf": "HCL",
  ".sol": "Solidity",
};

const getExtension = (path: string) => {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? null : path.slice(dot);
};

/** Fetches the full file tree for a commit */
export const fetchTree = Effect.fn("fetchTree")(function* (
  owner: string,
  repo: string,
  commit: TimelineCommit
) {
  const client = yield* OctokitClient;
  const response = yield* client
    .use((c) =>
      c.rest.git.getTree({ owner, repo, tree_sha: commit.sha, recursive: "1" })
    )
    .pipe(Effect.mapError((e) => mapOctokitError(e.cause, owner, repo)));

  const files = (response.data.tree ?? [])
    .filter((item) => item.type === "blob")
    .map((item) => {
      const ext = getExtension(item.path ?? "");
      return new TreeFile({
        path: item.path ?? "",
        size: item.size ?? 0,
        language: ext ? (EXT_MAP[ext] ?? null) : null,
      });
    });

  return new TreeSnapshot({
    sha: commit.sha as CommitSha,
    date: commit.date,
    files,
    truncated: response.data.truncated ?? false,
  });
});
