import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as frbeClient from '../frbeClient';
import {
  getIsFallbackMode,
  setFallbackMode,
  resetFallbackMode,
  fetchClub,
  fetchRoundSeries,
} from '../frbeClient';

describe('FRBE Client - Encapsulation & AbortSignal (frbeClient.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetFallbackMode();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does NOT export mutable isFallbackMode variable', () => {
    // Verify isFallbackMode is not exported as a property
    expect((frbeClient as any).isFallbackMode).toBeUndefined();
  });

  it('correctly encapsulates fallback mode through getters and setters', () => {
    expect(getIsFallbackMode()).toBe(false);
    setFallbackMode(true);
    expect(getIsFallbackMode()).toBe(true);
    resetFallbackMode();
    expect(getIsFallbackMode()).toBe(false);
  });

  it('aborts fetchClub immediately when an aborted AbortSignal is passed', async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchMock = vi.fn().mockImplementation((_url, options) => {
      if (options?.signal?.aborted) {
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ idclub: 541, name: 'Echiquier Leuzois' }),
      });
    });
    globalThis.fetch = fetchMock as any;

    await expect(fetchClub(541, true, controller.signal)).rejects.toThrow();
  });

  it('aborts fetchRoundSeries immediately when an aborted AbortSignal is passed', async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchMock = vi.fn().mockImplementation((_url, options) => {
      if (options?.signal?.aborted) {
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });
    globalThis.fetch = fetchMock as any;

    await expect(fetchRoundSeries(1, true, controller.signal)).rejects.toThrow();
  });
});
