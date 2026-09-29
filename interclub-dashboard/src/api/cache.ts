// Simple TTL Cache using memory and sessionStorage to prevent hammering the FRBE API

interface CacheItem<T> {
  timestamp: number;
  data: T;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function getCached<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = sessionStorage.getItem(`frbe_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheItem<T>;
    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(`frbe_cache_${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    const item: CacheItem<T> = {
      timestamp: Date.now(),
      data,
    };
    sessionStorage.setItem(`frbe_cache_${key}`, JSON.stringify(item));
  } catch {
    // SessionStorage may be full or disabled, silently fail
  }
}

export function clearCache(): void {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('frbe_cache_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore
  }
}
