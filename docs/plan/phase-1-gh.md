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
packages/api/                     # ✅ DONE — oRPC router + typed client
  src/
    router.ts             # oRPC router (health.check placeholder)
    client.ts             # createClient(baseUrl) → typed RouterClient
    index.ts              # re-exports

packages/github/
  src/
    index.ts              # public exports
    client.ts             # OctokitClient Effect service ("use" pattern wrapper)
    parser.ts             # URL/slug parser → { owner, repo }
    errors.ts             # all error types (Effect Schema.TaggedError)
    fetchers/
      repo.ts             # repo metadata
      commits.ts          # commit history (paginated)
      trees.ts            # file tree at a commit SHA
      languages.ts        # language breakdown
      contributors.ts     # contributor list
    sampling.ts           # commit sampling strategies
    timeline.ts           # orchestrator: composes all fetchers → RepoTimeline
    types.ts              # all data types (Schema.Class + branded primitives)
  package.json
  tsconfig.json

apps/web/
  app/
    rpc/[[...rest]]/
      route.ts            # ✅ DONE — thin catch-all (imports from @workspace/api)
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

Use `Schema.TaggedError` — serializable over the network, yieldable without `Effect.fail()`, built-in `_tag` for `catchTag`. Use `Schema.Defect` to wrap unknown errors from Octokit.

```ts
import { Schema } from "effect"

export class RepoNotFound extends Schema.TaggedError<RepoNotFound>()(
  "RepoNotFound",
  {
    owner: Schema.String,
    repo: Schema.String,
  }
) {}

export class RateLimited extends Schema.TaggedError<RateLimited>()(
  "RateLimited",
  {
    resetAt: Schema.Number,
    remaining: Schema.Number,
  }
) {}

export class GitHubApiError extends Schema.TaggedError<GitHubApiError>()(
  "GitHubApiError",
  {
    status: Schema.Number,
    message: Schema.String,
    cause: Schema.Defect, // wraps unknown Octokit error
  }
) {}

export class InvalidRepoUrl extends Schema.TaggedError<InvalidRepoUrl>()(
  "InvalidRepoUrl",
  {
    input: Schema.String,
  }
) {}

// Union for exhaustive matching
export const GitHubError = Schema.Union(RepoNotFound, RateLimited, GitHubApiError, InvalidRepoUrl)
export type GitHubError = typeof GitHubError.Type
```

## OctokitClient Service (`client.ts`)

Uses the "use" pattern: wraps Octokit behind a typed interface with centralized error handling, automatic tracing spans, and `Config.redacted` for the token (testable, redacted in logs).

```ts
import { Context, Config, Effect, Layer, Redacted } from "effect"
import { Octokit } from "octokit"

export class OctokitError extends Schema.TaggedError<OctokitError>()(
  "OctokitError",
  { cause: Schema.Defect }
) {}

export type IOctokitClient = Readonly<{
  use: <A>(
    fn: (client: Octokit) => Promise<A>
  ) => Effect.Effect<A, OctokitError>
}>

const make = Effect.gen(function* () {
  const token = yield* Config.redacted("GITHUB_TOKEN")

  const client = new Octokit({ auth: Redacted.value(token) })

  const use = <A>(fn: (client: Octokit) => Promise<A>) =>
    Effect.tryPromise({
      try: () => fn(client),
      catch: (cause) => new OctokitError({ cause }),
    }).pipe(Effect.withSpan(`octokit.${fn.name ?? "use"}`))

  return { use } satisfies IOctokitClient
})

export class OctokitClient extends Context.Tag("@gitreel/OctokitClient")<
  OctokitClient,
  IOctokitClient
>() {
  static readonly Default = Layer.effect(this, make).pipe(
    Layer.annotateSpans({ module: "OctokitClient" })
  )
}
```

Fetchers call `octokit.use(c => c.rest.repos.get(...))` — all Octokit errors caught as typed `OctokitError`, each call automatically traced. Easy to test with a mock layer.

## Fetcher Signatures

Each fetcher uses `Effect.fn` for call-site tracing. Fetchers call `OctokitClient.use(...)` and map `OctokitError` to domain errors (e.g. 404 -> `RepoNotFound`, 403+rate-limit headers -> `RateLimited`, rest -> `GitHubApiError`).

```ts
// fetchers/repo.ts
export const fetchRepo = Effect.fn("fetchRepo")(
  function* (owner: string, repo: string) {
    const octokit = yield* OctokitClient
    const { data } = yield* octokit.use(
      (c) => c.rest.repos.get({ owner, repo })
    ).pipe(
      Effect.catchTag("OctokitError", (e) => mapOctokitError(e, owner, repo))
    )
    return RepoMeta.make({ ... })
  }
)
// Effect<RepoMeta, RepoNotFound | RateLimited | GitHubApiError, OctokitClient>

// fetchers/commits.ts
export const fetchCommits = Effect.fn("fetchCommits")(
  function* (owner: string, repo: string) { ... }
)
// Effect<TimelineCommit[], RateLimited | GitHubApiError, OctokitClient>

// fetchers/trees.ts
export const fetchTree = Effect.fn("fetchTree")(
  function* (owner: string, repo: string, sha: string) { ... }
)
// Effect<TreeSnapshot, GitHubApiError, OctokitClient>

// fetchers/languages.ts
export const fetchLanguages = Effect.fn("fetchLanguages")(
  function* (owner: string, repo: string) { ... }
)
// Effect<LanguageBreakdown, GitHubApiError, OctokitClient>

// fetchers/contributors.ts
export const fetchContributors = Effect.fn("fetchContributors")(
  function* (owner: string, repo: string) { ... }
)
// Effect<Contributor[], GitHubApiError, OctokitClient>
```

Shared helper to map `OctokitError` -> domain errors based on HTTP status/headers:

```ts
// errors.ts (or a shared helper)
const mapOctokitError = (e: OctokitError, owner: string, repo: string) => {
  const cause = e.cause
  if (cause instanceof RequestError) {
    if (cause.status === 404) return new RepoNotFound({ owner, repo })
    if (cause.status === 403 && cause.response?.headers["x-ratelimit-remaining"] === "0")
      return new RateLimited({ resetAt: ..., remaining: 0 })
  }
  return new GitHubApiError({ status: cause.status ?? 500, message: String(cause), cause })
}
```

## Orchestrator (`timeline.ts`)

Uses `Effect.fn` for tracing. `Effect.provide(OctokitClient.Default)` happens once at the oRPC boundary, not here — the orchestrator just declares `OctokitClient` as a dependency.

```ts
export const fetchRepoTimeline = Effect.fn("fetchRepoTimeline")(
  function* (input: string) {
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

    return RepoTimeline.make({
      repo: repoMeta,
      commits: allCommits,
      keyframes,
      languages,
      contributors,
      totalCommits: allCommits.length,
      totalStars: repoMeta.stars,
      fetchedAt: new Date(),
    })
  }
)
```

## oRPC Layer (`packages/api/src/router.ts`)

Router lives in `@workspace/api`. `Effect.provide(OctokitClient.Default)` applied once here at the boundary. Error mapping uses `Effect.catchTags` for exhaustive handling.

```ts
import { os, ORPCError } from "@orpc/server"
import { z } from "zod"
import { fetchRepoTimeline, OctokitClient } from "@workspace/github"
import { Effect } from "effect"

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
        // map Effect errors → oRPC typed errors exhaustively
        Effect.catchTags({
          RepoNotFound: (e) => Effect.fail(errors.REPO_NOT_FOUND({ data: { owner: e.owner, repo: e.repo } })),
          RateLimited: (e) => Effect.fail(errors.RATE_LIMITED({ data: { resetAt: e.resetAt } })),
          InvalidRepoUrl: (e) => Effect.fail(errors.INVALID_URL({ data: { input: e.input } })),
          GitHubApiError: (e) => Effect.die(new ORPCError("INTERNAL_SERVER_ERROR", { message: e.message })),
        }),
        // provide layer once at the boundary
        Effect.provide(OctokitClient.Default)
      )

      return await Effect.runPromise(program)
    }),
}

export const router = { health, github }
```

## Core Types (`types.ts`)

Use `Schema.Class` for runtime validation + serialization. Branded types for domain primitives (SHA, dates). These are the single source of truth — derive TS types from schema.

```ts
import { Schema } from "effect"

// Branded primitives
export const CommitSha = Schema.String.pipe(Schema.brand("CommitSha"))
export type CommitSha = typeof CommitSha.Type

export const GitHubLogin = Schema.String.pipe(Schema.brand("GitHubLogin"))
export type GitHubLogin = typeof GitHubLogin.Type

// Data models
export class RepoMeta extends Schema.Class<RepoMeta>("RepoMeta")({
  owner: Schema.String,
  name: Schema.String,
  fullName: Schema.String,
  description: Schema.NullOr(Schema.String),
  stars: Schema.Number,
  forks: Schema.Number,
  createdAt: Schema.String,
  defaultBranch: Schema.String,
}) {}

export class CommitAuthor extends Schema.Class<CommitAuthor>("CommitAuthor")({
  login: GitHubLogin,
  avatarUrl: Schema.String,
}) {}

export class TimelineCommit extends Schema.Class<TimelineCommit>("TimelineCommit")({
  sha: CommitSha,
  message: Schema.String,
  author: CommitAuthor,
  date: Schema.String,
  treeSha: CommitSha,
}) {}

export class TreeFile extends Schema.Class<TreeFile>("TreeFile")({
  path: Schema.String,
  size: Schema.Number,
  language: Schema.NullOr(Schema.String),
}) {}

export class TreeSnapshot extends Schema.Class<TreeSnapshot>("TreeSnapshot")({
  commitSha: CommitSha,
  date: Schema.String,
  files: Schema.Array(TreeFile),
}) {}

export class Contributor extends Schema.Class<Contributor>("Contributor")({
  login: GitHubLogin,
  avatarUrl: Schema.String,
  contributions: Schema.Number,
}) {}

export const LanguageBreakdown = Schema.Record({ key: Schema.String, value: Schema.Number })
export type LanguageBreakdown = typeof LanguageBreakdown.Type

export class RepoTimeline extends Schema.Class<RepoTimeline>("RepoTimeline")({
  repo: RepoMeta,
  commits: Schema.Array(TimelineCommit),
  keyframes: Schema.Array(TreeSnapshot),
  languages: LanguageBreakdown,
  contributors: Schema.Array(Contributor),
  totalCommits: Schema.Number,
  totalStars: Schema.Number,
  fetchedAt: Schema.Date,
}) {}
```

## Fetcher Details

### URL Parser (`parser.ts`)
- Input: full URL, `owner/repo`, URL with extra paths (`/tree/main/src`)
- Output: `Effect<{ owner: string, repo: string }, InvalidRepoUrl>` (pure, no `R`)
- Regex-based, handles `github.com`, `www.github.com`, `.git` suffix
- Uses `Effect.fn("parseRepoUrl")` for tracing

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

1. ~~oRPC `packages/api` + catch-all route in `apps/web`~~ ✅ DONE
2. Package scaffolding (`packages/github`, deps, tsconfig)
3. `types.ts` — Schema.Class data models + branded primitives
4. `errors.ts` — Schema.TaggedError types + OctokitError mapping helper
5. `parser.ts` — URL parsing (pure Effect)
6. `client.ts` — OctokitClient "use" pattern wrapper + Config.redacted
7. `fetchers/repo.ts` — simplest fetcher, validates Effect + octokit wiring
8. `fetchers/commits.ts` — paginated fetching
9. `sampling.ts` — commit sampling (pure function)
10. `fetchers/trees.ts` — tree snapshots
11. `fetchers/languages.ts` — language data
12. `fetchers/contributors.ts` — contributor data
13. `timeline.ts` — orchestrator composing all effects
14. `index.ts` — public exports
15. Wire github procedures into `@workspace/api` router
16. oRPC client usage in `apps/web`

## Future Considerations (not in scope now)

- **PR-based fetching**: for huge repos, fetch merge commits from PRs. Design `RepoTimeline` to be source-agnostic.
- **Stargazer timeline**: expensive paginated endpoint. Skip for MVP, use total count.
- **Caching layer**: Redis/KV keyed by `owner/repo`. Add when deploying.
- **GitHub App auth**: swap PAT for installation tokens when needed.
- **Effect Schema for oRPC**: could replace Zod for oRPC input validation to stay fully in Effect ecosystem. Evaluate after MVP. Data types already use Schema.Class so the migration surface is small.

---

**Done:**
- `packages/api` — oRPC router (`health.check`), typed client (`createClient`), exported as `@workspace/api`
- `apps/web/app/rpc/[[...rest]]/route.ts` — thin catch-all handler
- `apps/web` deps cleaned: `@orpc/*` + `zod` moved to `@workspace/api`, web depends on `@workspace/api: workspace:*`
- Verified: `POST /rpc/health/check` → `{"json":{"status":"ok"}}`