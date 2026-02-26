import { describe, expect, it } from "bun:test";
import { TreeFile, TreeSnapshot } from "../../../../packages/github/src/types";
import { filterFiles } from "./filter";
import { getFrameData, interpolateKeyframes } from "./interpolation";
import { getLanguageColor } from "./language-colors";
import { buildHierarchy, computeAllKeyframes, computeLayout } from "./treemap";
import type { TreemapKeyframe } from "./types";

const file = (path: string, size: number, language: string | null = null) =>
  new TreeFile({ path, size, language });

const snapshot = (files: TreeFile[], sha = "abc123", date = "2024-01-01") =>
  new TreeSnapshot({ sha: sha as never, date, files, truncated: false });

// --- filterFiles ---

describe("filterFiles", () => {
  it("excludes noise files and zero-size", () => {
    const files = [
      file("src/index.ts", 100, "TypeScript"),
      file(".git/HEAD", 50),
      file("node_modules/foo/bar.js", 200),
      file("package-lock.json", 500),
      file("bun.lock", 300),
      file("dist/bundle.js", 400),
      file("src/empty.ts", 0, "TypeScript"),
      file(".DS_Store", 10),
      file(".env", 20),
      file("src/utils.ts", 80, "TypeScript"),
    ];
    const result = filterFiles(files);
    const paths = result.map((f) => f.path);

    expect(paths).toContain("src/index.ts");
    expect(paths).toContain("src/utils.ts");
    expect(paths).not.toContain(".git/HEAD");
    expect(paths).not.toContain("node_modules/foo/bar.js");
    expect(paths).not.toContain("package-lock.json");
    expect(paths).not.toContain("bun.lock");
    expect(paths).not.toContain("dist/bundle.js");
    expect(paths).not.toContain("src/empty.ts");
    expect(paths).not.toContain(".DS_Store");
    expect(paths).not.toContain(".env");
  });

  it("sorts by size desc and respects maxFiles", () => {
    const files = [
      file("small.ts", 10),
      file("big.ts", 1000),
      file("mid.ts", 500),
    ];
    const result = filterFiles(files, 2);
    expect(result.map((f) => f.path)).toEqual(["big.ts", "mid.ts"]);
  });
});

// --- getLanguageColor ---

describe("getLanguageColor", () => {
  it("returns correct color for known languages", () => {
    expect(getLanguageColor("TypeScript")).toBe("#3178c6");
    expect(getLanguageColor("Python")).toBe("#3572A5");
  });

  it("returns gray for null or unknown", () => {
    expect(getLanguageColor(null)).toBe("#8b8b8b");
    expect(getLanguageColor("Brainfuck")).toBe("#8b8b8b");
  });
});

// --- buildHierarchy ---

describe("buildHierarchy", () => {
  it("builds nested tree from flat paths", () => {
    const files = [
      file("src/index.ts", 100, "TypeScript"),
      file("src/utils/math.ts", 50, "TypeScript"),
      file("README.md", 30, "Markdown"),
    ];
    const tree = buildHierarchy(files);

    expect(tree.name).toBe("root");
    expect(tree.children).toHaveLength(2);

    const src = tree.children?.find((c) => c.name === "src");
    expect(src?.children).toHaveLength(2);

    const utils = src?.children?.find((c) => c.name === "utils");
    expect(utils?.children).toHaveLength(1);
    expect(utils?.children?.[0]?.name).toBe("math.ts");
  });
});

// --- computeLayout ---

describe("computeLayout", () => {
  const snap = snapshot([
    file("src/app.ts", 500, "TypeScript"),
    file("src/utils.ts", 300, "TypeScript"),
    file("lib/helper.py", 200, "Python"),
  ]);

  it("produces rects with normalized 0-1 coordinates", () => {
    const kf = computeLayout(snap);

    expect(kf.rects.length).toBeGreaterThan(0);
    for (const r of kf.rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1.001);
      expect(r.y + r.h).toBeLessThanOrEqual(1.001);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
      expect(r.opacity).toBe(1);
    }
  });

  it("assigns correct colors and ids", () => {
    const kf = computeLayout(snap);
    const tsRect = kf.rects.find((r) => r.id === "src/app.ts");
    const pyRect = kf.rects.find((r) => r.id === "lib/helper.py");

    expect(tsRect?.color).toBe("#3178c6");
    expect(pyRect?.color).toBe("#3572A5");
  });

  it("preserves commitSha and date", () => {
    const kf = computeLayout(snap);
    expect(kf.commitSha).toBe("abc123");
    expect(kf.date).toBe("2024-01-01");
  });
});

// --- interpolateKeyframes ---

describe("interpolateKeyframes", () => {
  const makeKf = (rects: TreemapKeyframe["rects"]): TreemapKeyframe => ({
    rects,
    commitSha: "sha",
    date: "date",
  });

  const rect = (id: string, x: number) => ({
    id,
    x,
    y: 0,
    w: 0.1,
    h: 0.1,
    color: "#fff",
    label: id,
    language: null,
    opacity: 1,
  });

  it("lerps shared rects", () => {
    const a = makeKf([rect("file.ts", 0)]);
    const b = makeKf([rect("file.ts", 1)]);
    const result = interpolateKeyframes(a, b, 0.5);

    expect(result).toHaveLength(1);
    expect(result[0]?.x).toBeCloseTo(0.5);
    expect(result[0]?.opacity).toBe(1);
  });

  it("fades in new files", () => {
    const a = makeKf([]);
    const b = makeKf([rect("new.ts", 0.5)]);
    const result = interpolateKeyframes(a, b, 0.3);

    expect(result).toHaveLength(1);
    expect(result[0]?.opacity).toBeCloseTo(0.3);
  });

  it("fades out deleted files", () => {
    const a = makeKf([rect("old.ts", 0.2)]);
    const b = makeKf([]);
    const result = interpolateKeyframes(a, b, 0.7);

    expect(result).toHaveLength(1);
    expect(result[0]?.opacity).toBeCloseTo(0.3);
  });
});

// --- getFrameData ---

describe("getFrameData", () => {
  it("returns empty for no keyframes", () => {
    const { rects } = getFrameData(0, [], 100);
    expect(rects).toEqual([]);
  });

  it("returns static rects for single keyframe", () => {
    const kf: TreemapKeyframe = {
      rects: [
        {
          id: "a",
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          color: "#fff",
          label: "a",
          language: null,
          opacity: 1,
        },
      ],
      commitSha: "sha",
      date: "date",
    };
    const { rects } = getFrameData(50, [kf], 100);
    expect(rects).toHaveLength(1);
  });

  it("selects correct segment", () => {
    const kfs = computeAllKeyframes([
      snapshot([file("a.ts", 100, "TypeScript")], "s1", "2024-01-01"),
      snapshot([file("a.ts", 200, "TypeScript")], "s2", "2024-02-01"),
      snapshot([file("a.ts", 300, "TypeScript")], "s3", "2024-03-01"),
    ]);

    const start = getFrameData(0, kfs, 100);
    expect(start.keyframeIndex).toBe(0);

    const mid = getFrameData(75, kfs, 100);
    expect(mid.keyframeIndex).toBe(1);
  });
});
