import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCached,
  setCached,
  clearCache,
  DEFAULT_TTL_MS,
  COMPLETED_ROUND_TTL_MS,
} from '../cache';

function createMockStorage(): Storage {
  const map = new Map<string, string>();
  const target: any = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
    key(i: number) {
      return Array.from(map.keys())[i] ?? null;
    },
  };

  return new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      return map.get(prop);
    },
    set(t, prop: string, value) {
      if (prop in t) {
        t[prop] = value;
        return true;
      }
      map.set(prop, String(value));
      return true;
    },
    deleteProperty(_t, prop: string) {
      return map.delete(prop);
    },
    ownKeys() {
      return Array.from(map.keys());
    },
    getOwnPropertyDescriptor(_t, prop: string) {
      if (map.has(prop)) {
        return {
          value: map.get(prop),
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return undefined;
    },
  });
}

describe('Cache Management (cache.ts)', () => {
  let mockSession: Storage;
  let mockLocal: Storage;

  beforeEach(() => {
    mockSession = createMockStorage();
    mockLocal = createMockStorage();
    vi.stubGlobal('sessionStorage', mockSession);
    vi.stubGlobal('localStorage', mockLocal);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and retrieves data in sessionStorage by default', () => {
    setCached('test_key', { foo: 'bar' });
    expect(mockSession.getItem('frbe_cache_test_key')).not.toBeNull();
    expect(mockLocal.getItem('frbe_cache_test_key')).toBeNull();

    const retrieved = getCached<{ foo: string }>('test_key');
    expect(retrieved).toEqual({ foo: 'bar' });
  });

  it('stores completed rounds persistently in localStorage when persistent option is true', () => {
    setCached('round_1', { round: 1, played: true }, { persistent: true, ttlMs: COMPLETED_ROUND_TTL_MS });

    expect(mockLocal.getItem('frbe_cache_round_1')).not.toBeNull();
    expect(mockSession.getItem('frbe_cache_round_1')).toBeNull();

    const retrieved = getCached<{ round: number; played: boolean }>('round_1', COMPLETED_ROUND_TTL_MS);
    expect(retrieved).toEqual({ round: 1, played: true });
  });

  it('expires cache items when TTL has elapsed', () => {
    const originalNow = Date.now;
    let currentTime = 1000000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    setCached('expiring_item', 'some_data', { ttlMs: 5000 });
    expect(getCached('expiring_item', 5000)).toBe('some_data');

    // Advance time beyond TTL
    currentTime += 6000;
    expect(getCached('expiring_item', 5000)).toBeNull();

    // Verify key was removed upon expiration
    expect(mockSession.getItem('frbe_cache_expiring_item')).toBeNull();

    vi.spyOn(Date, 'now').mockImplementation(originalNow);
  });

  it('comprehensive clearCache purges frbe_cache_* and fide_* keys from both sessionStorage and localStorage', () => {
    // Populate session storage
    mockSession.setItem('frbe_cache_club_541', JSON.stringify({ timestamp: Date.now(), data: 'club' }));
    mockSession.setItem('fide_v3_carlsen', JSON.stringify({ rating: 2880 }));
    mockSession.setItem('other_app_setting', 'keep_me');

    // Populate local storage
    mockLocal.setItem('frbe_cache_series_1', JSON.stringify({ timestamp: Date.now(), data: 'round1' }));
    mockLocal.setItem('fide_profile_123', JSON.stringify({ rating: 2100 }));
    mockLocal.setItem('director_key', 'secret_key');

    clearCache();

    // Verify FRBE and FIDE keys removed from sessionStorage
    expect(mockSession.getItem('frbe_cache_club_541')).toBeNull();
    expect(mockSession.getItem('fide_v3_carlsen')).toBeNull();
    expect(mockSession.getItem('other_app_setting')).toBe('keep_me');

    // Verify FRBE and FIDE keys removed from localStorage
    expect(mockLocal.getItem('frbe_cache_series_1')).toBeNull();
    expect(mockLocal.getItem('fide_profile_123')).toBeNull();
    expect(mockLocal.getItem('director_key')).toBe('secret_key');
  });

  it('has correct default constants', () => {
    expect(DEFAULT_TTL_MS).toBe(15 * 60 * 1000);
    expect(COMPLETED_ROUND_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
