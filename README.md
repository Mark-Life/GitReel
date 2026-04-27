# GitReel

Generate animated video recaps of GitHub repositories — visualizing commits, contributors, languages, and file structure evolution over time. Think "Spotify Wrapped" but for your repo.

## How It Works

1. Paste a GitHub repo URL
2. GitReel fetches the repo timeline (commits, contributors, languages, file trees)
3. Remotion renders an animated video with multiple scenes

## Scenes

- **Title Card** — repo name, stars, commit count
- **Treemap Timelapse** — file structure evolving over commits
- **Stats Explosion** — languages, contributors, repo age
- **Number Slam** — key metrics with animated counters
- **Before/After** — file tree comparison (first vs latest)
- **Boss Entry** — top contributors showcase
- **Wrapped Card** — summary card
- **Outro** — closing with repo info

## Architecture

```
apps/web          — Next.js app with Remotion player
packages/github   — GitHub API client (Effect-based, Octokit)
packages/api      — oRPC router exposing timeline endpoint
packages/ui       — shared UI components (shadcn/ui)
```

## Stack

- **Runtime**: Bun
- **Framework**: Next.js (App Router)
- **Video**: Remotion
- **API**: oRPC
- **GitHub Client**: Effect + Octokit
- **Build**: Turborepo
- **Linting**: Ultracite (Biome)
- **UI**: shadcn/ui + Tailwind CSS

## Getting Started

```bash
bun install
bun dev
```

Set `GITHUB_TOKEN` in `apps/web/.env.local` for higher API rate limits.

## Commands

| Command | Description |
| --- | --- |
| `bun dev` | Start dev server |
| `bun run build` | Build all apps and packages |
| `bun run lint` | Lint everything |
| `bun run fix` | Auto-fix formatting and lint issues |
