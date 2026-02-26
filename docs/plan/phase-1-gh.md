# Phase 1: GitHub Data Package (`packages/github`)

Internal Turborepo package that fetches and shapes all GitHub data needed for video rendering.

## Package Info

- **Location**: `packages/github`
- **Name**: `@workspace/github`
- **Runtime**: server-only (oRPC handlers consume it)
- **Auth**: PAT via `GITHUB_TOKEN` env var (GitHub App migration later)

## Dependencies

| Package | Purpose |
|---|---|
| `octokit` | GitHub REST API client (auth, pagination, throttling, retry) |
| `effect` | Typed error handling, concurrency, dependency injection |
| `@orpc/server` | Type-safe RPC server (procedures, router, error schemas) |
| `@orpc/client` | Type-safe RPC client (browser → server calls) |
| `zod` | Input validation for oRPC procedures |

### Why Effect.ts

Every fetcher returns `Effect<T, E, R>` where:
- `T` = success data
- `E` = typed error (`RepoNotFound | RateLimited | GitHubApiError`)
- `R` = dependencies (`OctokitClient`)

Benefits over try/catch:
- Errors are **in the type signature** — caller knows exactly what can fail
- Composition with `Effect.all`, `Effect.forEach` for parallel fetching
- Built-in concurrency control (`{ concurrency: 5 }`) for tree fetching
- Retry/timeout as composable combinators, not octokit config
- No thrown exceptions anywhere in the package

### Why oRPC

- Type-safe RPC between Next.js server and browser client
- Typed error schemas — client knows exactly what errors to expect
- Zod input validation built-in
- Next.js App Router adapter (catch-all route handler)
- Lighter than tRPC, OpenAPI-compatible if we ever need external API

## Architecture

```
packages/github/
  src/
    index.ts              # public exports
    client.ts             # OctokitClient Effect service
    parser.ts             # URL/slug parser → { owner, repo }
    errors.ts             # all error types (Effect Data.TaggedError)
    fetchers/
      repo.ts             # repo metadata
      commits.ts          # commit history (paginated)
      trees.ts            # file tree at a commit SHA
      languages.ts        # language breakdown
      contributors.ts     # contributor list
    sampling.ts           # commit sampling strategies
    timeline.ts           # orchestrator: composes all fetchers → RepoTimeline
    types.ts              # all data types
  package.json
  tsconfig.json

apps/web/
  app/
    rpc/[[...rest]]/
      route.ts            # oRPC catch-all handler
  lib/
    rpc/
      router.ts           # oRPC router (procedures calling packages/github)
      client.ts           # oRPC client for browser
```

## Data Flow

```
Browser                          Server (Next.js)                packages/github
  │                                │                                │
  │  orpc.github.getTimeline({     │                                │
  │    url: "vercel/next.js"       │                                │
  │  })                            │                                │
  │ ──────── RPC call ──────────→  │                                │
  │                                │  fetchRepoTimeline(url)        │
  │                                │ ─── Effect.runPromise ───────→ │
  │                                │                                │  parse URL
  │                                │                                │  fetch repo meta  ─┐
  │                                │                                │  fetch commits     ─┤ parallel
  │                                │                                │  fetch languages   ─┤
  │                                │                                │  fetch contributors─┘
  │                                │                                │  sample commits
  │                                │                                │  fetch trees (5 concurrent)
  │                                │                                │  assemble RepoTimeline
  │                                │  ←─── RepoTimeline ──────────  │
  │  ←─── JSON response ────────   │                                │
  │                                │                                │
  │  On error:                     │                                │
  │  ←─ typed ORPCError ─────────  │  ←── Effect error mapped ───  │
  │  { code: "REPO_NOT_FOUND" }   │                                │
```

## Effect Error Types (`errors.ts`)

```ts
import { Data } from "effect"

export class RepoNotFound extends Data.TaggedError("RepoNotFound")<{
  owner: string
  repo: string
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
  resetAt: number
  remaining: number
}> {}

export class GitHubApiError extends Data.TaggedError("GitHubApiError")<{
  status: number
  message: string
}> {}

export class InvalidRepoUrl extends Data.TaggedError("InvalidRepoUrl")<{
  input: string
}> {}

// Union type for all GitHub errors
export type GitHubError = RepoNotFound | RateLimited | GitHubApiError | InvalidRepoUrl
```

## OctokitClient Service (`client.ts`)

```ts
import { Context, Effect, Layer } from "effect"
import { Octokit } from "octokit"

export class OctokitClient extends Context.Tag("OctokitClient")<
  OctokitClient,
  Octokit
>() {}

export const OctokitClientLive = Layer.sync(OctokitClient, () =>
  new Octokit({ auth: process.env.GITHUB_TOKEN })
)
```

Fetchers depend on `OctokitClient` via Effect's service pattern — no global singletons, easy to test with mock layer.

## Fetcher Signatures

Each fetcher returns an Effect:

```ts
// fetchers/repo.ts
export const fetchRepo = (owner: string, repo: string):
  Effect<RepoMeta, RepoNotFound | GitHubApiError, OctokitClient>

// fetchers/commits.ts
export const fetchCommits = (owner: string, repo: string):
  Effect<TimelineCommit[], RateLimited | GitHubApiError, OctokitClient>

// fetchers/trees.ts
export const fetchTree = (owner: string, repo: string, sha: string):
  Effect<TreeSnapshot, GitHubApiError, OctokitClient>

// fetchers/languages.ts
export const fetchLanguages = (owner: string, repo: string):
  Effect<LanguageBreakdown, GitHubApiError, OctokitClient>

// fetchers/contributors.ts
export const fetchContributors = (owner: string, repo: string):
  Effect<Contributor[], GitHubApiError, OctokitClient>
```

## Orchestrator (`timeline.ts`)

```ts
export const fetchRepoTimeline = (input: string) =>
  Effect.gen(function* () {
    const { owner, repo } = yield* parseRepoUrl(input)

    // parallel: independent fetches
    const [repoMeta, allCommits, languages, contributors] = yield* Effect.all([
      fetchRepo(owner, repo),
      fetchCommits(owner, repo),
      fetchLanguages(owner, repo),
      fetchContributors(owner, repo),
    ], { concurrency: "unbounded" })

    // sample commits → keyframe SHAs
    const keyframeShas = sampleCommits(allCommits)

    // fetch trees with concurrency limit
    const keyframes = yield* Effect.forEach(
      keyframeShas,
      (sha) => fetchTree(owner, repo, sha),
      { concurrency: 5 }
    )

    return {
      repo: repoMeta,
      commits: allCommits,
      keyframes,
      languages,
      contributors,
      totalCommits: allCommits.length,
      totalStars: repoMeta.stars,
      fetchedAt: Date.now(),
    } satisfies RepoTimeline
  })
```

## oRPC Layer (`apps/web/lib/rpc/router.ts`)

```ts
import { os, ORPCError } from "@orpc/server"
import { z } from "zod"
import { fetchRepoTimeline } from "@workspace/github"
import { Effect } from "effect"
import { OctokitClientLive } from "@workspace/github/client"

const github = {
  getTimeline: os
    .input(z.object({ url: z.string().min(1) }))
    .errors({
      REPO_NOT_FOUND: { data: z.object({ owner: z.string(), repo: z.string() }) },
      RATE_LIMITED: { data: z.object({ resetAt: z.number() }) },
      INVALID_URL: { data: z.object({ input: z.string() }) },
    })
    .handler(async ({ input, errors }) => {
      const program = fetchRepoTimeline(input.url).pipe(
        Effect.provide(OctokitClientLive)
      )

      const result = await Effect.runPromiseExit(program)

      if (result._tag === "Success") return result.value

      const error = result.cause
      // map Effect errors → oRPC typed errors
      // RepoNotFound → errors.REPO_NOT_FOUND(...)
      // RateLimited → errors.RATE_LIMITED(...)
      // InvalidRepoUrl → errors.INVALID_URL(...)
      // GitHubApiError → throw new ORPCError("INTERNAL_SERVER_ERROR")
    }),
}

export const router = { github }
```

## Core Types (`types.ts`)

```ts
type RepoTimeline = {
  repo: RepoMeta
  commits: TimelineCommit[]
  keyframes: TreeSnapshot[]
  languages: LanguageBreakdown
  contributors: Contributor[]
  totalCommits: number
  totalStars: number
  fetchedAt: number
}

type RepoMeta = {
  owner: string
  name: string
  fullName: string
  description: string | null
  stars: number
  forks: number
  createdAt: string
  defaultBranch: string
}

type TimelineCommit = {
  sha: string
  message: string
  author: { login: string; avatarUrl: string }
  date: string
  treeSha: string
}

type TreeSnapshot = {
  commitSha: string
  date: string
  files: TreeFile[]
}

type TreeFile = {
  path: string
  size: number
  language: string | null
}

type LanguageBreakdown = Record<string, number>

type Contributor = {
  login: string
  avatarUrl: string
  contributions: number
}
```

## Fetcher Details

### URL Parser (`parser.ts`)
- Input: full URL, `owner/repo`, URL with extra paths (`/tree/main/src`)
- Output: `Effect<{ owner, repo }, InvalidRepoUrl>`
- Regex-based, handles `github.com`, `www.github.com`, `.git` suffix

### Commit History (`fetchers/commits.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/commits` (100 per page)
- Returns: sha, message, author login/avatar, date, tree sha

### Commit Sampling (`sampling.ts`)
- Pure function (no Effect needed — just array in, array out)

| Total commits | Strategy | Target keyframes |
|---|---|---|
| < 100 | All commits | all |
| 100-500 | Every Nth | ~50 |
| 500-5k | 1 per day | ~50-100 |
| 5k+ | 1 per week | ~50-100 |

- Always include first + last commit

### File Trees (`fetchers/trees.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
- Filter: `type === "blob"` only
- Map extensions → languages locally

### Languages (`fetchers/languages.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/languages`
- Single request, returns `{ lang: bytes }`

### Contributors (`fetchers/contributors.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/contributors` (cap at 200)

### Repo Metadata (`fetchers/repo.ts`)
- Endpoint: `GET /repos/{owner}/{repo}`

## Rate Limit Budget

| Fetcher | Small (<100) | Medium (500) | Large (5k+) |
|---|---|---|---|
| Repo meta | 1 | 1 | 1 |
| Commits | 1 | 5 | 50 |
| Trees | ~30-50 | ~50 | ~50-100 |
| Languages | 1 | 1 | 1 |
| Contributors | 1 | 1 | 2 |
| **Total** | **~35** | **~58** | **~105-155** |

## Error Mapping (Effect → oRPC)

| Effect Error | oRPC Code | HTTP Status |
|---|---|---|
| `InvalidRepoUrl` | `INVALID_URL` | 400 |
| `RepoNotFound` | `REPO_NOT_FOUND` | 404 |
| `RateLimited` | `RATE_LIMITED` | 429 |
| `GitHubApiError` | `INTERNAL_SERVER_ERROR` | 500 |

## Implementation Order

1. Package scaffolding (`packages/github`, deps, tsconfig)
2. `types.ts` — all data types
3. `errors.ts` — Effect tagged errors
4. `parser.ts` — URL parsing (pure Effect)
5. `client.ts` — OctokitClient service + layer
6. `fetchers/repo.ts` — simplest fetcher, validates Effect + octokit wiring
7. `fetchers/commits.ts` — paginated fetching
8. `sampling.ts` — commit sampling (pure function)
9. `fetchers/trees.ts` — tree snapshots
10. `fetchers/languages.ts` — language data
11. `fetchers/contributors.ts` — contributor data
12. `timeline.ts` — orchestrator composing all effects
13. `index.ts` — public exports
14. oRPC router + handler in `apps/web`
15. oRPC client in `apps/web`

## Future Considerations (not in scope now)

- **PR-based fetching**: for huge repos, fetch merge commits from PRs. Design `RepoTimeline` to be source-agnostic.
- **Stargazer timeline**: expensive paginated endpoint. Skip for MVP, use total count.
- **Caching layer**: Redis/KV keyed by `owner/repo`. Add when deploying.
- **GitHub App auth**: swap PAT for installation tokens when needed.
- **Effect Schema**: could replace Zod for oRPC input validation to stay fully in Effect ecosystem. Evaluate after MVP.
