import type { TreemapRect } from "./types";

export interface FileTreeNode {
  children: FileTreeNode[];
  color: string;
  depth: number;
  isDir: boolean;
  language: string | null;
  name: string;
  path: string;
}

export interface FlatFileEntry {
  color: string;
  depth: number;
  isDir: boolean;
  language: string | null;
  name: string;
  path: string;
}

/** Build a hierarchical file tree from treemap rects */
export const buildFileTree = (rects: TreemapRect[]): FileTreeNode => {
  const root: FileTreeNode = {
    name: "",
    path: "",
    isDir: true,
    language: null,
    color: "#8b8b8b",
    depth: 0,
    children: [],
  };

  for (const rect of rects) {
    const parts = rect.id.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }
      const isLast = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          isDir: !isLast,
          language: isLast ? rect.language : null,
          color: isLast ? rect.color : "#8b8b8b",
          depth: i + 1,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  sortTree(root);
  return root;
};

const sortTree = (node: FileTreeNode) => {
  node.children.sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
};

/** Flatten tree to a display list with depth for indentation */
export const flattenTree = (
  node: FileTreeNode,
  maxDepth = 5
): FlatFileEntry[] => {
  const result: FlatFileEntry[] = [];

  const walk = (n: FileTreeNode) => {
    if (n.depth > 0 && n.depth <= maxDepth) {
      result.push({
        name: n.name,
        path: n.path,
        isDir: n.isDir,
        language: n.language,
        color: n.color,
        depth: n.depth,
      });
    }
    if (n.isDir && n.depth < maxDepth) {
      for (const child of n.children) {
        walk(child);
      }
    }
  };

  walk(node);
  return result;
};

/** Get set of file paths from rects */
export const getFilePaths = (rects: TreemapRect[]) =>
  new Set(rects.map((r) => r.id));

/** Build a size lookup from rects (id → w*h) */
const buildSizeMap = (rects: TreemapRect[]) => {
  const map = new Map<string, number>();
  for (const r of rects) {
    map.set(r.id, r.w * r.h);
  }
  return map;
};

/** Compute diff between two keyframe rect sets */
export const diffFileSets = (
  prevRects: TreemapRect[],
  currRects: TreemapRect[]
) => {
  const prev = getFilePaths(prevRects);
  const curr = getFilePaths(currRects);
  const prevSizes = buildSizeMap(prevRects);
  const currSizes = buildSizeMap(currRects);
  const added = new Set<string>();
  const removed = new Set<string>();
  const modified = new Set<string>();

  for (const p of curr) {
    if (!prev.has(p)) {
      added.add(p);
    } else if (prevSizes.get(p) !== currSizes.get(p)) {
      modified.add(p);
    }
  }
  for (const p of prev) {
    if (!curr.has(p)) {
      removed.add(p);
    }
  }

  return { added, removed, modified };
};
