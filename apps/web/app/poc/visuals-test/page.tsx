"use client";

import { Player } from "@remotion/player";
import { createClient } from "@workspace/api/client";
import { type FC, type FormEvent, useCallback, useState } from "react";
import { toVideoTimeline } from "../../../lib/remotion/convert";
import { ContributorGrid } from "../../../lib/remotion/scenes/contributor-grid";
import { LanguagePie } from "../../../lib/remotion/scenes/language-pie";
import { PulseRing } from "../../../lib/remotion/scenes/pulse-ring";
import type {
  ContributorGridProps,
  LanguagePieProps,
  PulseRingProps,
  VideoTimeline,
} from "../../../lib/remotion/types";

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

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; timeline: VideoTimeline }
  | { status: "error"; message: string };

export default function VisualsTestPage() {
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
        setState({ status: "ready", timeline });
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

      {state.status === "ready" && <ReadyView timeline={state.timeline} />}
    </div>
  );
}

function ReadyView({ timeline }: { timeline: VideoTimeline }) {
  const pieProps: LanguagePieProps = { languages: timeline.languages };
  const gridProps: ContributorGridProps = {
    contributors: timeline.contributors,
  };
  const pulseProps: PulseRingProps = { commits: timeline.commits };

  return (
    <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
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
  inputProps: LanguagePieProps | ContributorGridProps | PulseRingProps;
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
