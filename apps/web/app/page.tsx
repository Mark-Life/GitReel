"use client";

import { Player } from "@remotion/player";
import { getCached, normalizeRepoKey, setCache } from "@workspace/api/cache";
import { createClient } from "@workspace/api/client";
import {
  type FC,
  type FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toVideoTimeline } from "../lib/remotion/convert";
import { HypeComposition } from "../lib/remotion/hype-composition";
import { computeHypeConfig } from "../lib/remotion/hype-config";
import { CodeRain } from "../lib/remotion/scenes/code-rain";
import { ContributorGrid } from "../lib/remotion/scenes/contributor-grid";
import { DiffStats } from "../lib/remotion/scenes/diff-stats";
import { FileTreeTimelapse } from "../lib/remotion/scenes/file-tree-timelapse";
import { HypeTitle } from "../lib/remotion/scenes/hype-title";
import { LanguagePie } from "../lib/remotion/scenes/language-pie";
import { NumberSlam } from "../lib/remotion/scenes/number-slam";
import { PulseRing } from "../lib/remotion/scenes/pulse-ring";
import type {
  CodeRainProps,
  ContributorGridProps,
  DiffStatsProps,
  FileTreeTimelapseProps,
  GitReelProps,
  HypeTitleProps,
  LanguagePieProps,
  NumberSlamProps,
  PulseRingProps,
  VideoTimeline,
} from "../lib/remotion/types";
import { computeAllKeyframes } from "../lib/video/treemap";
import type { TreemapKeyframe } from "../lib/video/types";

const DEFAULT_URL = "https://github.com/Mark-Life/GitReel";

const PLAYER_WIDTH = 216;
const PLAYER_HEIGHT = 384;
const COMP_WIDTH = 1080;
const COMP_HEIGHT = 1920;
const FPS = 30;

const LanguagePieComponent = LanguagePie as unknown as FC<
  Record<string, unknown>
>;
const ContributorGridComponent = ContributorGrid as unknown as FC<
  Record<string, unknown>
>;
const PulseRingComponent = PulseRing as unknown as FC<Record<string, unknown>>;
const CodeRainComponent = CodeRain as unknown as FC<Record<string, unknown>>;
const HypeTitleComponent = HypeTitle as unknown as FC<Record<string, unknown>>;
const NumberSlamComponent = NumberSlam as unknown as FC<
  Record<string, unknown>
>;
const FileTreeTimelapseComponent = FileTreeTimelapse as unknown as FC<
  Record<string, unknown>
>;
const DiffStatsComponent = DiffStats as unknown as FC<Record<string, unknown>>;
const HypeCompositionComponent = HypeComposition as unknown as FC<
  Record<string, unknown>
>;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; timeline: VideoTimeline; keyframes: TreemapKeyframe[] }
  | { status: "error"; message: string };

type RenderState =
  | { status: "idle" }
  | { status: "rendering"; renderedFrames: number; totalFrames: number }
  | { status: "done"; url: string; timeMs: number }
  | { status: "error"; message: string };

export default function VisualsTestPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [state, setState] = useState<State>({ status: "idle" });

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setState({ status: "loading" });

      try {
        const cacheKey = normalizeRepoKey(url) ?? url;

        const cached = getCached<{
          timeline: VideoTimeline;
          keyframes: TreemapKeyframe[];
        }>(cacheKey);

        if (cached) {
          setState({
            status: "ready",
            timeline: cached.timeline,
            keyframes: cached.keyframes,
          });
          return;
        }

        const client = createClient(window.location.origin);
        const repo = await client.github.getTimeline({ url });
        const timeline = toVideoTimeline(repo);
        const keyframes = computeAllKeyframes(repo.snapshots);
        setCache(cacheKey, { timeline, keyframes });
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
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Visuals Test</h1>
      <p style={{ color: "#888", marginBottom: 24, fontSize: 14 }}>
        Preview individual visual scenes with real repo data.
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
  keyframes: TreemapKeyframe[];
  timeline: VideoTimeline;
}) {
  const { config, timings } = useMemo(
    () => computeHypeConfig(timeline, keyframes),
    [timeline, keyframes]
  );

  const hypeProps: GitReelProps = useMemo(
    () => ({ timeline, keyframes, timings }),
    [timeline, keyframes, timings]
  );

  const [renderState, setRenderState] = useState<RenderState>({
    status: "idle",
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleRender = useCallback(async () => {
    setRenderState({
      status: "rendering",
      renderedFrames: 0,
      totalFrames: config.durationInFrames,
    });
    abortRef.current = new AbortController();
    const start = performance.now();

    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          component: HypeComposition as unknown as FC<Record<string, unknown>>,
          durationInFrames: config.durationInFrames,
          fps: config.fps,
          width: COMP_WIDTH,
          height: COMP_HEIGHT,
          id: "hype",
        },
        inputProps: hypeProps as unknown as Record<string, unknown>,
        licenseKey: "free-license",
        hardwareAcceleration: "prefer-hardware",
        videoBitrate: "low",
        signal: abortRef.current.signal,
        onProgress: ({ renderedFrames }) => {
          setRenderState({
            status: "rendering",
            renderedFrames,
            totalFrames: config.durationInFrames,
          });
        },
      });

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      setRenderState({
        status: "done",
        url,
        timeMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setRenderState({ status: "idle" });
        return;
      }
      setRenderState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [config, hypeProps]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownload = useCallback(() => {
    if (renderState.status !== "done") {
      return;
    }
    const a = document.createElement("a");
    a.href = renderState.url;
    a.download = `gitreel-${timeline.meta.name}.mp4`;
    a.click();
  }, [renderState, timeline.meta.name]);

  const titleProps: HypeTitleProps = { meta: timeline.meta };
  const numberProps: NumberSlamProps = {
    totalCommits: timeline.totalCommits,
    stars: timeline.meta.stars,
    contributorCount: timeline.contributors.length,
  };

  const fileTreeProps: FileTreeTimelapseProps = {
    commits: timeline.commits,
    keyframes,
    totalCommits: timeline.totalCommits,
  };
  const diffStatsProps: DiffStatsProps = {
    keyframes,
    commits: timeline.commits,
  };

  const pieProps: LanguagePieProps = { languages: timeline.languages };
  const gridProps: ContributorGridProps = {
    contributors: timeline.contributors,
  };
  const pulseProps: PulseRingProps = { commits: timeline.commits };
  const rainProps: CodeRainProps = { commits: timeline.commits };

  return (
    <div>
      {/* Full Hype Composition */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Hype Composition</h2>
      <div
        style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 40 }}
      >
        <Player
          acknowledgeRemotionLicense
          component={HypeCompositionComponent}
          compositionHeight={COMP_HEIGHT}
          compositionWidth={COMP_WIDTH}
          controls
          durationInFrames={config.durationInFrames}
          fps={config.fps}
          inputProps={hypeProps as unknown as Record<string, unknown>}
          loop
          style={{
            width: 270,
            height: 480,
            borderRadius: 12,
          }}
        />

        {/* Export controls */}
        <div style={{ minWidth: 280 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: "#ccc" }}>
            Export
          </h3>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              disabled={renderState.status === "rendering"}
              onClick={handleRender}
              style={{
                padding: "10px 24px",
                backgroundColor:
                  renderState.status === "rendering" ? "#333" : "#3178c6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor:
                  renderState.status === "rendering"
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                fontFamily: "monospace",
              }}
              type="button"
            >
              {renderState.status === "rendering"
                ? "Rendering..."
                : "Export MP4"}
            </button>

            {renderState.status === "rendering" && (
              <button
                onClick={handleCancel}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
                type="button"
              >
                Cancel
              </button>
            )}
          </div>

          {renderState.status === "rendering" && (
            <div style={{ fontFamily: "monospace", fontSize: 13 }}>
              <p style={{ color: "#888", marginBottom: 8 }}>
                {renderState.renderedFrames} / {renderState.totalFrames} frames
                (
                {Math.round(
                  (renderState.renderedFrames / renderState.totalFrames) * 100
                )}
                %)
              </p>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  backgroundColor: "#222",
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    width: `${(renderState.renderedFrames / renderState.totalFrames) * 100}%`,
                    height: "100%",
                    backgroundColor: "#3178c6",
                    borderRadius: 3,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {renderState.status === "done" && (
            <div>
              <p
                style={{
                  color: "#22c55e",
                  marginBottom: 12,
                  fontFamily: "monospace",
                  fontSize: 13,
                }}
              >
                Done in {(renderState.timeMs / 1000).toFixed(1)}s
              </p>
              {/* biome-ignore lint/a11y/useMediaCaption: export preview */}
              <video
                controls
                src={renderState.url}
                style={{
                  width: 270,
                  height: 480,
                  borderRadius: 12,
                  backgroundColor: "#111",
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "monospace",
                  }}
                  type="button"
                >
                  Download MP4
                </button>
              </div>
            </div>
          )}

          {renderState.status === "error" && (
            <p
              style={{
                color: "#ef4444",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              Error: {renderState.message}
            </p>
          )}
        </div>
      </div>

      {/* Individual scene previews */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Individual Scenes</h2>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <ScenePlayer
          component={HypeTitleComponent}
          durationInFrames={60}
          inputProps={titleProps}
          label="Hype Title"
        />
        <ScenePlayer
          component={NumberSlamComponent}
          durationInFrames={90}
          inputProps={numberProps}
          label="Number Slam"
        />
        <ScenePlayer
          component={DiffStatsComponent}
          durationInFrames={120}
          inputProps={diffStatsProps}
          label="Diff Stats"
        />
        <ScenePlayer
          component={FileTreeTimelapseComponent}
          durationInFrames={300}
          inputProps={fileTreeProps}
          label="File Tree Timelapse"
        />
        <ScenePlayer
          component={LanguagePieComponent}
          durationInFrames={120}
          inputProps={pieProps}
          label="Language Pie"
        />
        <ScenePlayer
          component={ContributorGridComponent}
          durationInFrames={150}
          inputProps={gridProps}
          label="Contributor Grid"
        />
        <ScenePlayer
          component={PulseRingComponent}
          durationInFrames={120}
          inputProps={pulseProps}
          label="Pulse Ring"
        />
        <ScenePlayer
          component={CodeRainComponent}
          durationInFrames={90}
          inputProps={rainProps}
          label="Code Rain"
        />
      </div>
    </div>
  );
}

function ScenePlayer({
  label,
  component,
  inputProps,
  durationInFrames,
}: {
  component: FC<Record<string, unknown>>;
  durationInFrames: number;
  inputProps: object;
  label: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 8, color: "#ccc" }}>{label}</h2>
      <Player
        acknowledgeRemotionLicense
        component={component}
        compositionHeight={COMP_HEIGHT}
        compositionWidth={COMP_WIDTH}
        controls
        durationInFrames={durationInFrames}
        fps={FPS}
        inputProps={inputProps as unknown as Record<string, unknown>}
        loop
        style={{
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          borderRadius: 12,
        }}
      />
    </div>
  );
}
