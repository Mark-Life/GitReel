"use client";

import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface ScreenShakeProps {
  children: ReactNode;
  decay?: number;
  intensity?: number;
}

/** Applies a decaying screen-shake offset to children */
export function ScreenShake({
  children,
  intensity = 10,
  decay = 10,
}: ScreenShakeProps) {
  const frame = useCurrentFrame();

  const envelope = interpolate(frame, [0, decay], [1, 0], {
    extrapolateRight: "clamp",
  });

  const dx = Math.sin(frame * 17) * intensity * envelope;
  const dy = Math.sin(frame * 23) * intensity * envelope;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `translate(${dx}px, ${dy}px)`,
      }}
    >
      {children}
    </div>
  );
}
