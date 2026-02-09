import type { PostListItem } from "@/types/post";

export interface ListState {
  items: PostListItem[];
  nextCursor: string | null;
  scrollY: number;
  savedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "molt_list_state:";
const memoryCache = new Map<string, ListState>();

function readStoredMeta(key: string): { scrollY: number; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { scrollY?: number; savedAt?: number };
    if (typeof parsed.scrollY !== "number" || typeof parsed.savedAt !== "number") return null;
    return { scrollY: parsed.scrollY, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function readListState(key: string): ListState | null {
  if (typeof window === "undefined") return null;
  const memState = memoryCache.get(key);
  const meta = readStoredMeta(key);
  const now = Date.now();

  if (!memState) return null;

  const savedAt = meta?.savedAt ?? memState.savedAt;
  if (now - savedAt > CACHE_TTL_MS) {
    clearListState(key);
    return null;
  }

  if (!meta) {
    return memState;
  }

  return { ...memState, scrollY: meta.scrollY, savedAt };
}

export function writeListState(key: string, state: ListState): void {
  memoryCache.set(key, state);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify({ scrollY: state.scrollY, savedAt: state.savedAt })
    );
  } catch {
    // ignore storage errors
  }
}

export function clearListState(key: string): void {
  memoryCache.delete(key);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // ignore storage errors
  }
}
