"use client";

import { Player } from "@remotion/player";
import { createClient } from "@workspace/api/client";
import { type FC, type FormEvent, useCallback, useMemo, useState } from "react";
import { GitReelComposition } from "../../../lib/remotion/composition";
import { computeVideoConfig } from "../../../lib/remotion/config";
import { toVideoTimeline } from "../../../lib/remotion/convert";
import type { GitReelProps, VideoTimeline } from "../../../lib/remotion/types";
import { computeAllKeyframes } from "../../../lib/video/treemap";
import type { TreemapKeyframe } from "../../../lib/video/types";

const CompositionComponent = GitReelComposition as unknown as FC<
  Record<string, unknown>
>;

const DEFAULT_URL = "https://github.com/Mark-Life/GitReel";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; timeline: VideoTimeline; keyframes: TreemapKeyframe[] }
  | { status: "error"; message: string };

export default function E2eTestPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [state, setState] = useState<State>({ status: "idle" });

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setState({ status: "loading" });

      try {
        const client = createClient(window.location.origin);
        const repo = await client.github.getTimeline({ url });
        const timeline = toVideoTimeline(repo);
        const keyframes = computeAllKeyframes(repo.snapshots);
        setState({ status: "ready", timeline, keyframes });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [url]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "white",
        fontFamily: "monospace",
        padding: 40,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>GitReel E2E Test</h1>
      <p style={{ color: "#888", marginBottom: 24, fontSize: 14 }}>
        Fetch a real GitHub repo and render the full 4-scene composition.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 12, marginBottom: 32 }}
      >
        <input
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          style={{
            flex: 1,
            maxWidth: 500,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #333",
            backgroundColor: "#111",
            color: "white",
            fontFamily: "monospace",
            fontSize: 14,
          }}
          type="text"
          value={url}
        />
        <button
          disabled={state.status === "loading"}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            fontFamily: "monospace",
            fontSize: 14,
            cursor: state.status === "loading" ? "wait" : "pointer",
            opacity: state.status === "loading" ? 0.6 : 1,
          }}
          type="submit"
        >
          {state.status === "loading" ? "Fetching..." : "Fetch"}
        </button>
      </form>

      {state.status === "loading" && (
        <p style={{ color: "#888" }}>
          Loading repo data... this may take a minute.
        </p>
      )}

      {state.status === "error" && (
        <p style={{ color: "#ef4444" }}>Error: {state.message}</p>
      )}

      {state.status === "ready" && (
        <ReadyView keyframes={state.keyframes} timeline={state.timeline} />
      )}
    </div>
  );
}

function ReadyView({
  timeline,
  keyframes,
}: {
  timeline: VideoTimeline;
  keyframes: TreemapKeyframe[];
}) {
  const { config } = useMemo(
    () => computeVideoConfig(timeline, keyframes),
    [timeline, keyframes]
  );

  const inputProps: GitReelProps = useMemo(
    () => ({ timeline, keyframes }),
    [timeline, keyframes]
  );

  return (
    <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Preview</h2>
        <Player
          acknowledgeRemotionLicense
          component={CompositionComponent}
          compositionHeight={config.height}
          compositionWidth={config.width}
          controls
          durationInFrames={config.durationInFrames}
          fps={config.fps}
          inputProps={inputProps}
          loop
          style={{ width: 270, height: 480, borderRadius: 12 }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 300 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Timeline Stats</h2>
        <div
          style={{
            padding: 16,
            backgroundColor: "#111",
            borderRadius: 8,
            fontSize: 13,
            color: "#888",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p>
            Repo: {timeline.meta.fullName} — {timeline.meta.stars} stars
          </p>
          <p>
            Config: {config.width}x{config.height} @ {config.fps}fps
          </p>
          <p>
            Duration: {config.durationInFrames} frames (
            {(config.durationInFrames / config.fps).toFixed(1)}s)
          </p>
          <p>Keyframes: {keyframes.length}</p>
          <p>Commits: {timeline.totalCommits}</p>
          <p>Contributors: {timeline.contributors.length}</p>
          <p>Repo age: {timeline.repoAgeYears} year(s)</p>
          <p>
            Languages:{" "}
            {Object.entries(timeline.languages)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([lang]) => lang)
              .join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
