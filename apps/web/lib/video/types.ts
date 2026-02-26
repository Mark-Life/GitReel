export interface TreemapRect {
  color: string;
  h: number;
  id: string;
  label: string;
  language: string | null;
  opacity: number;
  w: number;
  x: number;
  y: number;
}

export interface TreemapKeyframe {
  commitSha: string;
  date: string;
  rects: TreemapRect[];
}

export interface TreemapConfig {
  height: number;
  maxFiles: number;
  padding: number;
  width: number;
}

export const DEFAULT_CONFIG: TreemapConfig = {
  width: 1920,
  height: 1080,
  maxFiles: 200,
  padding: 1,
};
