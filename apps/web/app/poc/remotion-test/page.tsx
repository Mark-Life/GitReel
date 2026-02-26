"use client";

import { Player } from "@remotion/player";
import { useCallback, useRef, useState } from "react";
import { PocComposition } from "./composition";

const FPS = 30;
const DURATION_IN_FRAMES = 10 * FPS; // 10 seconds
const WIDTH = 1080;
const HEIGHT = 1920; // vertical for reels

type RenderState =
  | { status: "idle" }
  | { status: "rendering"; renderedFrames: number; encodedFrames: number }
  | { status: "done"; url: string; timeMs: number }
  | { status: "error"; message: string };

export default function RemotionTestPage() {
  const [renderState, setRenderState] = useState<RenderState>({
    status: "idle",
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleRender = useCallback(async () => {
    setRenderState({
      status: "rendering",
      renderedFrames: 0,
      encodedFrames: 0,
    });
    abortRef.current = new AbortController();

    const start = performance.now();

    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          component: PocComposition,
          durationInFrames: DURATION_IN_FRAMES,
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
          id: "poc-test",
        },
        licenseKey: "free-license",
        signal: abortRef.current.signal,
        onProgress: ({ renderedFrames, encodedFrames }) => {
          setRenderState({
            status: "rendering",
            renderedFrames,
            encodedFrames,
          });
        },
      });

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const timeMs = Math.round(performance.now() - start);

      setRenderState({ status: "done", url, timeMs });
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
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownload = useCallback(() => {
    if (renderState.status !== "done") {
      return;
    }
    const a = document.createElement("a");
    a.href = renderState.url;
    a.download = "gitreel-poc.mp4";
    a.click();
  }, [renderState]);

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
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        Remotion Web Renderer POC
      </h1>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>
        Tests client-side video rendering via WebCodecs. No server needed.
      </p>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        {/* Player preview */}
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Preview</h2>
          <Player
            acknowledgeRemotionLicense
            component={PocComposition}
            compositionHeight={HEIGHT}
            compositionWidth={WIDTH}
            controls
            durationInFrames={DURATION_IN_FRAMES}
            fps={FPS}
            loop
            style={{ width: 270, height: 480, borderRadius: 12 }}
          />
        </div>

        {/* Render controls */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Render</h2>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
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
              }}
              type="button"
            >
              {renderState.status === "rendering"
                ? "Rendering..."
                : "Render MP4"}
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
                }}
                type="button"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Status */}
          {renderState.status === "rendering" && (
            <div>
              <p>
                Rendered: {renderState.renderedFrames} / {DURATION_IN_FRAMES}{" "}
                frames
              </p>
              <p>Encoded: {renderState.encodedFrames} frames</p>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  backgroundColor: "#222",
                  borderRadius: 4,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${(renderState.renderedFrames / DURATION_IN_FRAMES) * 100}%`,
                    height: "100%",
                    backgroundColor: "#3178c6",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          )}

          {renderState.status === "done" && (
            <div>
              <p style={{ color: "#22c55e", marginBottom: 12 }}>
                Done in {(renderState.timeMs / 1000).toFixed(1)}s
              </p>
              {/* biome-ignore lint/a11y/useMediaCaption: POC only */}
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
                  }}
                  type="button"
                >
                  Download MP4
                </button>
              </div>
            </div>
          )}

          {renderState.status === "error" && (
            <div>
              <p style={{ color: "#ef4444" }}>Error: {renderState.message}</p>
            </div>
          )}

          {/* Info */}
          <div
            style={{
              marginTop: 32,
              padding: 16,
              backgroundColor: "#111",
              borderRadius: 8,
              fontSize: 13,
              color: "#888",
            }}
          >
            <p>
              Config: {WIDTH}x{HEIGHT} @ {FPS}fps, {DURATION_IN_FRAMES / FPS}s
            </p>
            <p>Codec: H.264 (WebCodecs)</p>
            <p>Container: MP4</p>
            <p style={{ marginTop: 8, color: "#666" }}>
              Requires Chrome/Edge 94+. Firefox 130+. Safari 26+.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
