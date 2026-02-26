# Phase 1: GitHub Data Package (`packages/github`)

Internal Turborepo package that fetches and shapes all GitHub data needed for video rendering.

## Package Info

- **Location**: `packages/github`
- **Name**: `@workspace/github`
- **Runtime**: server-only (Next.js API routes consume it)
- **Auth**: PAT via `GITHUB_TOKEN` env var (GitHub App migration later)

## Dependencies

| Package | Purpose |
|---|---|
| `octokit` | GitHub REST API client (includes auth, pagination, throttling, retry) |
| `zod` | Runtime validation of API responses + env vars |

`octokit` (the unified package) bundles `@octokit/rest`, `@octokit/auth-token`, `@octokit/plugin-throttling`, `@octokit/plugin-retry` — everything needed in one import.

## Architecture

```
packages/github/
  src/
    index.ts              # public API: fetchRepoTimeline()
    client.ts             # octokit instance with throttling + retry
    parser.ts             # URL/slug parser → { owner, repo }
    fetchers/
      repo.ts             # repo metadata (name, description, stars, created_at)
      commits.ts          # commit history (paginated, sampled for large repos)
      trees.ts            # file tree at a given commit SHA
      languages.ts        # language breakdown (bytes per language)
      contributors.ts     # contributor list with commit counts
    sampling.ts           # commit sampling strategies
    timeline.ts           # orchestrator: calls all fetchers → RepoTimeline
    types.ts              # all exported types
  package.json
  tsconfig.json
```

## Public API

Single entry point:

```ts
import { fetchRepoTimeline } from "@workspace/github"

const timeline = await fetchRepoTimeline("https://github.com/vercel/next.js")
// or
const timeline = await fetchRepoTimeline("vercel/next.js")
```

Returns a `RepoTimeline` — fully self-contained data object the client uses to render.

## Core Types

```ts
type RepoTimeline = {
  repo: RepoMeta
  commits: TimelineCommit[]      // sampled, ordered by date
  keyframes: TreeSnapshot[]      // file tree at each keyframe commit
  languages: LanguageBreakdown   // { [lang]: bytes }
  contributors: Contributor[]
  totalCommits: number
  totalStars: number
  fetchedAt: number              // cache timestamp
}

type RepoMeta = {
  owner: string
  name: string
  fullName: string               // "owner/repo"
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
  path: string                   // full path: "src/lib/utils.ts"
  size: number                   // bytes
  language: string | null        // inferred from extension
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
- Input: full URL, shorthand `owner/repo`, or URL with extra paths (`/tree/main/src`)
- Output: `{ owner: string, repo: string }`
- Regex-based, handles `github.com`, `www.github.com`, trailing slashes, `.git` suffix

### Commit History (`fetchers/commits.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/commits`
- Paginated (100 per page, max)
- Returns: sha, message, author login/avatar, date, tree sha
- Stop condition: either all commits fetched or hit the sampling limit

### Commit Sampling (`sampling.ts`)
- Goal: reduce 10k+ commits to a manageable number of keyframes
- Strategy by repo size:

| Total commits | Strategy | Target keyframes |
|---|---|---|
| < 100 | All commits | all |
| 100–500 | Every Nth | ~50 |
| 500–5k | 1 per day (latest) | ~50–100 |
| 5k+ | 1 per week | ~50–100 |

- Always include: first commit, last commit
- Output: ordered list of selected commit SHAs for tree fetching

### File Trees (`fetchers/trees.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
- Returns full recursive tree in a single request (very efficient)
- Filter out: entries with `type !== "blob"` (keep only files)
- Map file extensions to languages using a local extension→language map

### Languages (`fetchers/languages.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/languages`
- Returns `{ "TypeScript": 150000, "JavaScript": 30000, ... }`
- Used for color mapping in treemap (GitHub linguist colors)
- Single request, no pagination

### Contributors (`fetchers/contributors.ts`)
- Endpoint: `GET /repos/{owner}/{repo}/contributors`
- Paginated (100 per page)
- Returns login, avatar URL, contribution count
- Cap at first 2 pages (200 contributors max — sufficient for video)

### Repo Metadata (`fetchers/repo.ts`)
- Endpoint: `GET /repos/{owner}/{repo}`
- Single request: name, description, stars, forks, created_at, default_branch

## Client Setup (`client.ts`)

```ts
import { Octokit } from "octokit"

// octokit with built-in throttling + retry
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, options) => { /* retry once */ },
    onSecondaryRateLimit: (retryAfter, options) => { /* retry once */ },
  },
  retry: { retries: 2 },
})
```

## Orchestration (`timeline.ts`)

```
fetchRepoTimeline(input):
  1. Parse input → { owner, repo }
  2. Fetch repo metadata                    (1 request)
  3. Fetch all commits (paginated)          (N requests)
  4. Sample commits → select keyframes      (pure compute)
  5. Fetch trees for each keyframe          (K requests, parallelized with limit)
  6. Fetch languages                        (1 request)
  7. Fetch contributors                     (1-2 requests)
  8. Assemble → RepoTimeline
```

Steps 2, 3, 6, 7 can run in parallel (first batch).
Step 5 runs after 3+4 (needs commit SHAs), parallelized with concurrency limit of 5.

## Rate Limit Budget

Typical request count per repo:

| Fetcher | Small (<100 commits) | Medium (500) | Large (5k+) |
|---|---|---|---|
| Repo meta | 1 | 1 | 1 |
| Commits | 1 | 5 | 50 (paginated) |
| Trees | ~30–50 | ~50 | ~50–100 |
| Languages | 1 | 1 | 1 |
| Contributors | 1 | 1 | 2 |
| **Total** | **~35** | **~58** | **~105–155** |

At 5,000 req/hour (PAT), this allows ~30-140 repos/hour. Caching will multiply this.

## Error Handling

- **404**: repo not found or private → clear error message
- **403 rate limit**: return remaining/reset time, caller decides (show to user)
- **422**: malformed request → should not happen if parser works
- **5xx**: octokit retry handles (2 retries with backoff)

All fetcher functions return discriminated results — no thrown exceptions in the public API.

## Future Considerations (not in scope now)

- **PR-based fetching**: for huge repos, fetch merge commits from PRs instead of all commits. Same tree snapshot approach, better narrative. Design `RepoTimeline` to be source-agnostic.
- **Stargazer timeline**: expensive endpoint (paginated, 30/page). Skip for MVP, use total count only.
- **Caching layer**: Redis/KV cache keyed by `owner/repo` with TTL. Add when deploying.
- **GitHub App auth**: swap PAT for installation tokens when rate limits become an issue.

## Implementation Order

1. `types.ts` — define all types
2. `parser.ts` + tests — URL parsing
3. `client.ts` — octokit instance
4. `fetchers/repo.ts` — simplest fetcher, validates setup works
5. `fetchers/commits.ts` — paginated fetching
6. `sampling.ts` — commit sampling logic
7. `fetchers/trees.ts` — tree snapshots
8. `fetchers/languages.ts` — language data
9. `fetchers/contributors.ts` — contributor data
10. `timeline.ts` — orchestrator
11. `index.ts` — public export
