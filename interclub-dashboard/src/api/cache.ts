// Simple TTL Cache using sessionStorage and localStorage to prevent hammering the FRBE API
import { clearFideMemoryCache } from './fideClient';

export interface CacheItem<T> {
  timestamp: number;
  data: T;
}

export interface CacheOptions {
  ttlMs?: number;
  persistent?: boolean; // false = sessionStorage (active/draft rounds), true = localStorage (completed rounds)
}

export const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const COMPLETED_ROUND_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getCached<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const fullKey = `frbe_cache_${key}`;

  // 1. Check sessionStorage first
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheItem<T>;
        if (Date.now() - parsed.timestamp <= ttlMs) {
          return parsed.data;
        }
        sessionStorage.removeItem(fullKey);
      }
    }
  } catch {
    // Ignore parse or storage errors
  }

  // 2. Check localStorage (persistent cache for completed rounds)
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheItem<T>;
        if (Date.now() - parsed.timestamp <= ttlMs) {
          return parsed.data;
        }
        localStorage.removeItem(fullKey);
      }
    }
  } catch {
    // Ignore parse or storage errors
  }

  return null;
}

export function setCached<T>(key: string, data: T, options?: CacheOptions | number): void {
  const fullKey = `frbe_cache_${key}`;
  const persistent = typeof options === 'object' ? !!options?.persistent : false;
  const item: CacheItem<T> = {
    timestamp: Date.now(),
    data,
  };

  try {
    const storage = persistent ? localStorage : sessionStorage;
    if (typeof storage !== 'undefined') {
      storage.setItem(fullKey, JSON.stringify(item));
    }
  } catch {
    // Storage may be full or disabled, silently fail
  }
}

export function clearCache(): void {
  const purgeStorage = (storage: Storage) => {
    try {
      const keys = Object.keys(storage);
      for (const key of keys) {
        if (key.startsWith('frbe_cache_') || key.startsWith('fide_')) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Ignore
    }
  };

  try {
    if (typeof sessionStorage !== 'undefined') {
      purgeStorage(sessionStorage);
    }
  } catch {
    // Ignore
  }

  try {
    if (typeof localStorage !== 'undefined') {
      purgeStorage(localStorage);
    }
  } catch {
    // Ignore
  }

  try {
    clearFideMemoryCache();
  } catch {
    // Ignore
  }
}
