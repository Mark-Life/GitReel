import type { TreeFile, TreeSnapshot } from "@workspace/github";
import {
  type HierarchyRectangularNode,
  hierarchy,
  treemap,
  treemapSquarify,
} from "d3-hierarchy";
import { filterFiles } from "./filter";
import { getLanguageColor } from "./language-colors";
import type { TreemapConfig, TreemapKeyframe, TreemapRect } from "./types";
import { DEFAULT_CONFIG } from "./types";

interface DirNode {
  children?: DirNode[];
  file?: TreeFile;
  name: string;
  size?: number;
}

/** Build nested directory tree from flat file list for d3-hierarchy */
export const buildHierarchy = (files: readonly TreeFile[]): DirNode => {
  const root: DirNode = { name: "root", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (const [i, part] of parts.entries()) {
      const isLeaf = i === parts.length - 1;

      if (isLeaf) {
        current.children ??= [];
        current.children.push({ name: part, file, size: file.size });
      } else {
        current.children ??= [];
        const existing = current.children.find(
          (c) => c.name === part && c.children !== undefined
        );
        if (existing) {
          current = existing;
        } else {
          const dir: DirNode = { name: part, children: [] };
          current.children.push(dir);
          current = dir;
        }
      }
    }
  }

  return root;
};

const extractRects = (node: HierarchyRectangularNode<DirNode>): TreemapRect[] =>
  node.leaves().flatMap((leaf) => {
    if (!leaf.data.file) {
      return [];
    }
    return [
      {
        id: leaf.data.file.path,
        x: leaf.x0,
        y: leaf.y0,
        w: leaf.x1 - leaf.x0,
        h: leaf.y1 - leaf.y0,
        color: getLanguageColor(leaf.data.file.language),
        label: leaf.data.name,
        language: leaf.data.file.language,
        opacity: 1,
      },
    ];
  });

/** Compute treemap layout for a single snapshot */
export const computeLayout = (
  snapshot: TreeSnapshot,
  config: TreemapConfig = DEFAULT_CONFIG
): TreemapKeyframe => {
  const filtered = filterFiles(snapshot.files, config.maxFiles);
  const tree = buildHierarchy(filtered);

  const root = hierarchy(tree)
    .sum((d) => d.size ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<DirNode>()
    .tile(treemapSquarify)
    .size([1, 1])
    .padding(config.padding / Math.max(config.width, config.height))
    .round(false);

  layout(root);

  return {
    rects: extractRects(root as HierarchyRectangularNode<DirNode>),
    commitSha: snapshot.sha,
    date: snapshot.date,
  };
};

/** Compute treemap keyframes for all snapshots */
export const computeAllKeyframes = (
  snapshots: readonly TreeSnapshot[],
  config: TreemapConfig = DEFAULT_CONFIG
): TreemapKeyframe[] => snapshots.map((s) => computeLayout(s, config));
