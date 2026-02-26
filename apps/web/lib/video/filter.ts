import type { TreeFile } from "@workspace/github";

const EXCLUDED_PATTERNS = [
  /^\.git\//,
  /node_modules\//,
  /\.lock$/,
  /lock\.json$/,
  /^dist\//,
  /\/dist\//,
  /^build\//,
  /\/build\//,
  /\.map$/,
  /__pycache__\//,
  /\.env$/,
  /\.env\./,
  /\.DS_Store$/,
  /^vendor\//,
  /\/vendor\//,
];

const isExcluded = (path: string) =>
  EXCLUDED_PATTERNS.some((p) => p.test(path));

/** Filter out noise files, sort by size desc, take top N */
export const filterFiles = (files: readonly TreeFile[], maxFiles = 200) =>
  files
    .filter((f) => f.size > 0 && !isExcluded(f.path))
    .sort((a, b) => b.size - a.size)
    .slice(0, maxFiles);
