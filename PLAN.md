# GitReel — Implementation Plan

Based on GOAL.md + validated POC (`/poc/remotion-test`).

## POC Results

- `@remotion/web-renderer` + `renderMediaOnWeb()` works in Chrome/Edge
- 10s 1080x1920 video renders client-side in ~5-15s depending on device
- Supported CSS subset is sufficient for treemap viz (rectangles, colors, text, transforms, opacity)
- Package is `@remotion/web-renderer` (not `@remotion/webcodecs` as GOAL.md says — that's for video format conversion)
- Free license available for individuals/small teams (`licenseKey: "free-license"`)
- Firefox 130+, Safari 26+ also supported (no FFmpeg WASM fallback needed for MVP)

## Architecture

```
User pastes repo URL
        ↓
Next.js app (server)
  → GitHub API fetch (REST, unauthenticated for public repos)
  → Returns: commit history, file trees, contributors, stars, languages
        ↓
Browser (client)
  → Processes data into treemap snapshots (d3-hierarchy)
  → Remotion composition renders each frame
  → @remotion/web-renderer encodes → MP4 via WebCodecs
  → User downloads MP4
```

Server cost: near zero (static app + GitHub API proxy for rate limits).

## Phases

### Phase 1: Data Layer

GitHub API integration. Fetch everything needed to build the video.

1. **GitHub URL parser** — extract `owner/repo` from various URL formats
2. **Commit history fetcher** — paginated, with sampling for large repos (>500 commits → 1 per day)
3. **File tree snapshots** — tree at key commits (using Git tree API, not cloning)
4. **Language detection** — use GitHub's `languages` endpoint for color mapping
5. **Contributor + stars** — aggregate counts over time
6. **Data types** — define TypeScript types for the entire pipeline output
7. **Rate limit handling** — conditional requests, caching, error states

Output: a `RepoTimeline` object with all data needed for video rendering.

### Phase 2: Treemap Engine

Turn `RepoTimeline` into renderable frame data.

1. **Treemap layout** — `d3-hierarchy` squarified treemap, files = leaves, dirs = groups
2. **Snapshot interpolation** — given frame N, interpolate between two treemap states
3. **Language colors** — GitHub linguist color map
4. **Commit sampling** — select N keyframes from commit history (target: 1 keyframe per ~1s of video)
5. **Scale handling** — filter noise files (lockfiles, generated), cap max visible files (~200)

Output: for any frame number → array of `{ x, y, w, h, color, label, opacity }` rects.

### Phase 3: Video Composition

Remotion scenes that consume treemap data.

1. **Title card scene** — repo name, description, star/contributor/commit counts with spring animations
2. **Treemap timelapse scene** — the main visualization
   - Rectangles appearing/growing/shrinking per commit
   - Author avatar popup on each commit
   - Commit counter + date overlay
   - Contributor count growing
   - Star milestone flashes
3. **Stats explosion scene** — final treemap state + animated stat counters
4. **Outro scene** — summary text
5. **Master composition** — sequences all scenes with `<Series>`, calculates total duration dynamically based on commit count

### Phase 4: UI

The web app interface.

1. **URL input page** — paste URL, validate, show repo preview (name, description, stars)
2. **Loading state** — progress while fetching GitHub data
3. **Preview** — Remotion `<Player>` showing the video before rendering
4. **Render controls** — render button, progress bar, cancel, download
5. **Error states** — invalid URL, private repo, rate limited, unsupported browser
6. **Responsive layout** — works on desktop (mobile = view only, rendering too heavy)

### Phase 5: Polish

1. **Watermark** — "Made with GitReel" overlay on free tier
2. **Share** — copy link, open in new tab for direct download
3. **SEO / OG tags** — landing page meta
4. **Analytics** — basic usage tracking (optional)

## Tech Decisions

| Decision | Choice | Reason |
|---|---|---|
| Rendering | `@remotion/web-renderer` | Validated in POC, zero server cost |
| Treemap layout | `d3-hierarchy` | Battle-tested, squarified algorithm built-in |
| GitHub API | `octokit` (REST) | No auth needed for public repos, simpler than GraphQL for this use case |
| State management | React state + URL params | No global state needed, video is stateless |
| Styling | Inline styles for Remotion, Tailwind for UI | Web renderer has CSS subset limitations |
| Video format | 1080x1920 MP4 @ 30fps | Reels/TikTok standard |

## Scope Decisions for MVP

| Feature | MVP? | Reason |
|---|---|---|
| Audio/music | No | Adds complexity, not essential |
| Custom themes | No | One good default theme first |
| Speed selection | No | Auto-calculate from commit count |
| Private repos | No | Requires auth flow, self-host option later |
| FFmpeg fallback | No | WebCodecs covers Chrome/Edge/Firefox/Safari now |
| Share via link | No | Download-only for MVP |
| Mobile rendering | No | Too slow, show "use desktop" message |

## File Structure (Planned)

```
apps/web/
  app/
    page.tsx                    # URL input + main flow
    poc/remotion-test/          # existing POC (keep for reference)
  components/
    url-input.tsx               # repo URL input + validation
    repo-preview.tsx            # shows repo info after URL parsed
    video-preview.tsx           # Remotion Player wrapper
    render-controls.tsx         # render button + progress + download
  lib/
    github/
      api.ts                    # octokit client, rate limit handling
      types.ts                  # GitHub API response types
      parser.ts                 # URL parser (owner/repo extraction)
      fetcher.ts                # orchestrates all API calls → RepoTimeline
    video/
      types.ts                  # RepoTimeline, TreemapFrame, etc.
      treemap.ts                # d3-hierarchy layout engine
      interpolation.ts          # frame interpolation between snapshots
      language-colors.ts        # GitHub linguist color map
      sampling.ts               # commit sampling for large repos
    remotion/
      composition.tsx           # master composition
      scenes/
        title.tsx               # title card
        treemap.tsx             # main treemap timelapse
        stats.tsx               # stats explosion
        outro.tsx               # outro card
      components/
        treemap-rect.tsx        # single animated rectangle
        counter.tsx             # animated counter
        avatar-popup.tsx        # author avatar on commit
        date-overlay.tsx        # date fast-forwarding
```

## Open Questions

1. **Video duration** — fixed 30s? Or scale with commit count (small repo = 15s, large = 60s)?
2. **Treemap granularity** — show individual files or group by directory for large repos?
3. **Commit message display** — show commit messages briefly, or just author + date?
4. **Landing page** — simple input-only page, or showcase with example videos?
5. **API proxy** — Next.js API route to proxy GitHub calls (avoids CORS, hides rate limit tokens)?
