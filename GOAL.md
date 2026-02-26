# GitReel

Paste a public GitHub repo URL → get a 30-60s timelapse video of the project's evolution. Optimized for social media (TikTok/Reels style).

## Target Audience

- Developers showing off their projects and work
- Open source repositories showcasing the amount of work/contributions
- Social media content for dev community

## Core Flow

1. User pastes public GitHub repo URL
2. App fetches commit history, file trees, contributors via GitHub API
3. Browser renders video frames using Remotion + React
4. WebCodecs API encodes frames → MP4 (client-side, zero server rendering cost)
5. User downloads video

## Architecture

### Client-Side Rendering (WebCodecs)

- **Remotion** for composing scenes in React
- **`@remotion/webcodecs`** for browser-side MP4 encoding
- Server only serves the app + proxies GitHub API calls
- Zero server rendering cost

### Tech Stack

- Monorepo: Turborepo (from template)
- Framework: Next.js
- Video: Remotion + `@remotion/player` (preview) + `@remotion/webcodecs` (export)
- Visualization: d3-hierarchy (treemap layout), Canvas/Pixi.js (WebGL rendering)
- GitHub API: octokit
- UI: shadcn/ui + Tailwind CSS

### Fallback

- FFmpeg WASM for browsers without WebCodecs support (Firefox/Safari)
- Acceptable tradeoff: dev audience is mostly Chrome/Edge

## Video Structure (30-60s)

```
[0-3s]   Title card: repo name, stars, contributors count
[3-45s]  Treemap timelapse — files appearing/growing/changing color
          - Author avatar pops up on each commit
          - Commit counter ticking up
          - Date overlay fast-forwarding
          - Contributor count growing
          - Stars milestone flashes (100, 1k, 10k...)
[45-55s] Final state: full treemap + summary stats explosion
[55-60s] Outro: "Built by N contributors over N years"
```

## Visualization

- **Treemap**: rectangles = files, size = LOC, color = language (GitHub language colors)
- Smooth interpolation between states (Remotion spring animations)
- Author avatars on contributions
- Commit/contributor/star counters
- Date timeline overlay

## Handling Scale

- Large repos (10k+ commits): sample commits (1 per day/week)
- Huge diffs: show file-level changes, not line-level. Aggregate with visual pulse/glow
- Filter noise: option to exclude lock files, generated code
- Cap animation speed: big commits get slightly longer screen time

## Data Source

- GitHub REST/GraphQL API for public repos only
- No auth required for public repos (rate limits apply, use conditional requests + caching)
- Private repos: users can self-host (open source)

## Business Model

- Open source
- Hosted service: free tier with watermark
- Potential premium: no watermark, custom themes, audio tracks

## Open Decisions

- Audio: bundle royalty-free tracks or silent?
- Customization: color themes / speed selection? Or fully automatic for MVP?
- Watermark design for free tier
