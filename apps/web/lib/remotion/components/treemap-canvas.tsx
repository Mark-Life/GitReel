"use client";

import type { TreemapRect } from "../../video/types";

const LABEL_AREA_THRESHOLD = 0.003;
const BORDER_RADIUS = 4;

interface TreemapCanvasProps {
  height: number;
  rects: TreemapRect[];
  width: number;
}

/** Renders TreemapRect[] as absolute-positioned divs scaled from normalized 0-1 coords to pixels */
export function TreemapCanvas({ rects, width, height }: TreemapCanvasProps) {
  return (
    <div style={{ position: "relative", width, height }}>
      {rects.map((rect) => {
        const pxX = rect.x * width;
        const pxY = rect.y * height;
        const pxW = rect.w * width;
        const pxH = rect.h * height;
        const area = rect.w * rect.h;
        const showLabel = area > LABEL_AREA_THRESHOLD && pxW > 30 && pxH > 16;

        return (
          <div
            key={rect.id}
            style={{
              position: "absolute",
              left: pxX,
              top: pxY,
              width: pxW,
              height: pxH,
              backgroundColor: rect.color,
              borderRadius: BORDER_RADIUS,
              opacity: rect.opacity,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
            }}
          >
            {showLabel && (
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: Math.min(11, pxH * 0.6),
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {rect.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
