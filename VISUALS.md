# GitReel — Visual Scene Ideas

Brainstorm of visual animations beyond the treemap. Each idea has a description, data requirements, and sizing tags:

- **S** = works for small repos (< 50 commits)
- **M** = works for medium repos (50-500 commits)
- **L** = works for large repos (500+ commits, many contributors)

---

## 1. Star History Line Chart

Animated SVG line chart drawing the star count over time. Line evolves left-to-right with `@remotion/paths` `evolvePath()`. A glowing dot follows the tip. Milestone markers pulse at round numbers (100, 1k, 10k).

- **Data:** star history over time (GitHub API: starred_at timestamps)
- **Size:** L (needs meaningful star count to look good; skip if < 50 stars)
- **Duration:** 3-5s
- **Remotion:** `evolvePath()` + `interpolate()` for line draw, `spring()` for milestone pops

---

## 2. Contributor Grid / Hall of Fame

Grid of circular avatars that pop in one by one (spring scale 0->1) in order of first contribution. Each avatar has a subtle glow ring colored by their most-used language. For large repos, show top 20-30 contributors; for small repos, show all.

- **Data:** contributors list with avatarUrl, contribution count
- **Size:** S M L (scales naturally — 3 contributors still looks intentional, 30 looks epic)
- **Duration:** 3-6s (stagger delay per avatar)
- **Remotion:** staggered `spring()` with `delay: i * STAGGER`, grid layout computed from count

---

## 3. Commit Heatmap Calendar

GitHub-style contribution heatmap (weeks x days grid) that fills in cell-by-cell from left to right, fast-forwarding through the project's history. Cells color-intensity = commit count that day.

- **Data:** commit dates aggregated by day
- **Size:** M L (needs 3+ months of history to look good; skip for repos < 3 months old)
- **Duration:** 4-6s
- **Remotion:** `interpolate()` sweeping a "fill cursor" left-to-right across columns

---

## 4. Language Breakdown Pie/Ring Chart

Animated donut chart where each segment grows from 0 using `strokeDashoffset`. Language name labels fade in beside each segment. Could transition from the pie to a horizontal stacked bar for emphasis.

- **Data:** `languages` map (already available)
- **Size:** S M L (always interesting if repo has 2+ languages)
- **Duration:** 3-4s
- **Remotion:** SVG circle segments, animated `strokeDashoffset` via `interpolate()`

---

## 5. Commit Velocity / Activity Graph

Bar chart or area chart showing commits-per-week/month over time. Bars spring up staggered left-to-right. Optionally overlay a smoothed trend line. Highlights bursts of activity (hackathons, release sprints).

- **Data:** commit dates bucketed by week/month
- **Size:** M L (needs 2+ months; for small repos with 10 commits, skip or use daily granularity)
- **Duration:** 4-5s
- **Remotion:** staggered `spring()` bars, `evolvePath()` for trend line overlay

---

## 6. File Type Explosion / Radial Burst

Files radiate outward from center, grouped by language into colored clusters. Each file is a small dot/circle. Starts as a single point, expands into a radial layout. Size of each dot = file size. Think: firework / particle burst grouped by color.

- **Data:** file list with language + size from final snapshot
- **Size:** M L (needs 20+ files to look interesting)
- **Duration:** 3-4s
- **Remotion:** `spring()` for radial distance, `interpolate()` for angle distribution, stagger by group

---

## 7. Git Branch / Merge Timeline

Simplified git graph showing branches splitting and merging over time. Main line runs vertically, branches arc out and merge back. Each merge point pulses. Works like a stylized subway map.

- **Data:** branch/merge info from commit parents (requires multi-parent commit detection)
- **Size:** M L (small repos are usually linear — skip if < 3 merges)
- **Duration:** 4-6s
- **Remotion:** SVG paths for branch lines, `evolvePath()` to draw them, `spring()` for merge pulses
- **Complexity:** HIGH — needs branch topology extraction from commit graph

---

## 8. Code Rain / Diff Waterfall

Matrix-style falling characters using actual code snippets or diff fragments. Green for additions, red for deletions. Characters fall at varying speeds. Purely aesthetic / mood-setting scene.

- **Data:** commit messages or sampled file names (lightweight — no real diff data needed)
- **Size:** S M L (universal — even 5 commits produce enough text)
- **Duration:** 2-4s (best as a transition overlay or background)
- **Remotion:** array of falling text columns, `interpolate(frame, ...)` for Y position per column

---

## 9. Top Files Leaderboard

Animated ranked list of the largest/most-changed files. Bars race from left to right, reordering over time (bar chart race style). File names on the left, bar length = LOC or change count.

- **Data:** file sizes across snapshots (already have treemap data)
- **Size:** M L (needs enough files and changes over time; skip if < 10 files)
- **Duration:** 5-8s
- **Remotion:** `interpolate()` for bar widths + Y positions, smooth reordering transitions

---

## 10. Contributor Takeover Timeline

Horizontal timeline bar split into colored segments per contributor. As time progresses, segments grow showing who dominated each period. Author avatars float above their segments.

- **Data:** commits with author + date
- **Size:** M L (needs 3+ contributors to be meaningful)
- **Duration:** 4-5s
- **Remotion:** stacked horizontal bar growing left-to-right, `interpolate()` for segment widths

---

## 11. Directory Sunburst / Zoomable Circle Pack

Nested circles representing directory structure. Outer ring = top-level dirs, inner = subdirs, innermost = files. Circles grow from center outward. Alternative to treemap that emphasizes hierarchy depth.

- **Data:** file tree (already have snapshots)
- **Size:** M L (needs directory depth > 2 to be visually interesting)
- **Duration:** 3-5s
- **Remotion:** d3-hierarchy circle pack layout, `spring()` for radius growth, stagger by depth level

---

## 12. Commit Message Word Cloud

Words from commit messages sized by frequency, fading/scaling in one by one. Filter out stopwords and common prefixes ("fix", "update", "add"). Reveals the project's vocabulary.

- **Data:** commit messages (already have them)
- **Size:** M L (needs 30+ commits for meaningful word frequency)
- **Duration:** 3-5s
- **Remotion:** pre-computed word positions, staggered `spring()` scale-in per word

---

## 13. Pulse Ring / Repo Heartbeat

A single pulsing circle in the center. Each commit triggers a ring that expands outward and fades (like a sonar ping). Faster pulses during active periods, slower during quiet periods. Overlaid timestamp.

- **Data:** commit timestamps
- **Size:** S M L (universal — even 5 commits create a nice rhythm)
- **Duration:** 3-5s
- **Remotion:** array of expanding rings, each with `interpolate()` for scale + opacity, triggered at commit frame offsets

---

## 14. First Commit -> Latest Commit Journey

Split screen: left shows the initial file tree (just a few files), right shows current state. Morphs from left to right with files flying across. Shows the growth story in one powerful visual.

- **Data:** first snapshot + last snapshot
- **Size:** S M L (universal — even a repo going from 1 file to 5 tells a story)
- **Duration:** 4-5s
- **Remotion:** two treemap states, `interpolate()` for position morph, `spring()` for new files appearing

---

## 15. Release Timeline / Milestones

Vertical timeline with release tags (v1.0, v2.0) as nodes. Each node springs in with version number and date. Lines connect them. Brief stat underneath each ("+200 commits, +5 contributors").

- **Data:** GitHub releases/tags API
- **Size:** M L (needs tagged releases; skip if repo has 0 releases)
- **Duration:** 3-6s
- **Remotion:** staggered `spring()` per node, `evolvePath()` for connecting line

---

## Recommended Scene Compositions

### Small Repo (< 50 commits, 1-3 contributors)

```
Title Card (3s)
 -> Pulse Ring Heartbeat (3s)
 -> Treemap Timelapse (10-15s)
 -> Language Pie Chart (3s)
 -> First -> Latest Journey (4s)
 -> Contributor Grid (2s)
 -> Outro (5s)
```

Total: ~30-35s. Emphasis on the growth story since raw numbers are small.

### Medium Repo (50-500 commits, 3-20 contributors)

```
Title Card (3s)
 -> Commit Heatmap Calendar (4s)
 -> Treemap Timelapse (20-30s)
 -> Language Pie Chart (3s)
 -> Commit Velocity Graph (4s)
 -> Contributor Grid (4s)
 -> Stats Explosion (5s)
 -> Outro (5s)
```

Total: ~48-58s. Balanced mix of data viz and treemap.

### Large Repo (500+ commits, 20+ contributors, stars)

```
Title Card (3s)
 -> Star History Line Chart (4s)
 -> Commit Heatmap Calendar (5s)
 -> Treemap Timelapse (30-45s)
 -> Top Files Leaderboard Race (6s)
 -> Language Pie Chart (3s)
 -> Contributor Takeover Timeline (5s)
 -> Contributor Grid / Hall of Fame (5s)
 -> Release Timeline (4s)
 -> Stats Explosion (5s)
 -> Outro (5s)
```

Total: ~75-90s (would need to trim/select subset). Pick top 4-5 most impactful scenes.

---

## Priority for Implementation

| # | Scene | Effort | Visual Impact | Data Ready? |
|---|-------|--------|---------------|-------------|
| 4 | Language Pie Chart | Low | Medium | Yes |
| 2 | Contributor Grid | Low | High | Yes |
| 13 | Pulse Ring Heartbeat | Low | Medium | Yes |
| 5 | Commit Velocity Graph | Medium | High | Yes (needs bucketing) |
| 3 | Commit Heatmap | Medium | High | Yes (needs bucketing) |
| 8 | Code Rain | Low | Medium | Yes |
| 14 | First->Latest Journey | Medium | High | Yes |
| 1 | Star History | Medium | High | No (needs new API call) |
| 9 | Top Files Leaderboard | Medium | High | Partial (need per-snapshot sizes) |
| 12 | Word Cloud | Medium | Medium | Yes (needs NLP filtering) |
| 10 | Contributor Timeline | Medium | Medium | Yes (needs bucketing) |
| 6 | File Type Explosion | Medium | High | Yes |
| 11 | Sunburst | High | High | Yes |
| 15 | Release Timeline | Medium | Medium | No (needs new API call) |
| 7 | Branch Graph | High | High | No (needs commit parent data) |

Start with top 4-5 (Language Pie, Contributor Grid, Pulse Ring, Commit Velocity, Heatmap) — all use existing data with minimal processing.
