"use client";

import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = [
  "#3178c6", // TypeScript blue
  "#f1e05a", // JavaScript yellow
  "#e34c26", // HTML red
  "#563d7c", // CSS purple
  "#89e051", // Shell green
  "#dea584", // Rust orange
  "#00ADD8", // Go cyan
  "#A97BFF", // Kotlin purple
];

/** Simulates a treemap rectangle appearing with spring animation */
function TreemapRect({
  index,
  total,
  color,
}: {
  index: number;
  total: number;
  color: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const size = 100 / cols;

  const progress = spring({
    frame,
    fps,
    delay: index * 3,
    config: { damping: 200 },
  });

  const scale = interpolate(progress, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: `${col * size}%`,
        top: `${row * size}%`,
        width: `${size}%`,
        height: `${size}%`,
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          margin: 4,
          backgroundColor: color,
          borderRadius: 8,
          opacity,
          transform: `scale(${scale})`,
          display: "flex",
        }}
      />
    </div>
  );
}

/** Counter that ticks up */
function Counter({ label, target }: { label: string; target: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames * 0.8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const count = Math.floor(progress * target);

  const fadeIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        color: "white",
        fontFamily: "monospace",
        fontSize: 24,
        opacity: fadeIn,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
        {label}
      </span>
      <span>{count.toLocaleString()}</span>
    </div>
  );
}

/** Title card scene */
function TitleCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subtitleSpring = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 48,
              fontFamily: "monospace",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            remotion-dev/remotion
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            opacity: subtitleSpring,
            marginTop: 20,
          }}
        >
          <div style={{ flex: 1 }} />
          <Counter label="commits" target={4521} />
          <div style={{ width: 40 }} />
          <Counter label="stars" target={21_400} />
          <div style={{ width: 40 }} />
          <Counter label="contributors" target={198} />
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ flex: 1 }} />
      </div>
    </AbsoluteFill>
  );
}

/** Treemap scene */
function TreemapScene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      {COLORS.map((color, i) => (
        <TreemapRect
          color={color}
          index={i}
          key={color}
          total={COLORS.length}
        />
      ))}
    </AbsoluteFill>
  );
}

/** Outro card */
function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }} />
        <span
          style={{
            color: "white",
            fontSize: 32,
            fontFamily: "monospace",
            textAlign: "center",
            opacity: fadeIn,
          }}
        >
          Built with GitReel
        </span>
        <div style={{ flex: 1 }} />
      </div>
    </AbsoluteFill>
  );
}

/** Main POC composition -- title card, treemap animation, outro */
export function PocComposition() {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={3 * fps} premountFor={fps}>
        <TitleCard />
      </Sequence>
      <Sequence durationInFrames={4 * fps} from={3 * fps} premountFor={fps}>
        <TreemapScene />
      </Sequence>
      <Sequence durationInFrames={3 * fps} from={7 * fps} premountFor={fps}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
