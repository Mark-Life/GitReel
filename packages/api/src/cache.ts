const CACHE_PREFIX = "gitreel:timeline:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const GITHUB_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/;
const SLUG_RE = /^([^/]+)\/([^/]+)$/;

/** Normalize any GitHub URL or owner/repo slug to "owner/repo" for cache keying */
export const normalizeRepoKey = (input: string): string | null => {
  const trimmed = input.trim();
  const urlMatch = GITHUB_URL_RE.exec(trimmed);
  if (urlMatch?.[1] && urlMatch[2]) {
    return `${urlMatch[1]}/${urlMatch[2]}`.toLowerCase();
  }
  const slugMatch = SLUG_RE.exec(trimmed);
  if (slugMatch?.[1] && slugMatch[2]) {
    return `${slugMatch[1]}/${slugMatch[2]}`.toLowerCase();
  }
  return null;
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Read a cached value from localStorage, returning null if missing or expired */
export const getCached = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) {
      return null;
    }
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

/** Write a value to localStorage with a timestamp for TTL */
export const setCache = <T>(key: string, data: T) => {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
};

/** Remove a specific cache entry, or all gitreel cache entries if no key given */
export const clearCache = (key?: string) => {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key);
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) {
      keys.push(k);
    }
  }
  for (const k of keys) {
    localStorage.removeItem(k);
  }
};
