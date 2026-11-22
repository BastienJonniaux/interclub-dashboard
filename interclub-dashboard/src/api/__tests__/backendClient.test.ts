import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkServerHealth,
  fetchRoundDrafts,
  COLD_START_TIMEOUT_MS,
  PING_TIMEOUT_MS,
} from '../backendClient';

describe('Backend Client - Cold Start & Resilience (backendClient.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('exports COLD_START_TIMEOUT_MS configured to 50000ms', () => {
    expect(COLD_START_TIMEOUT_MS).toBe(50_000);
    expect(PING_TIMEOUT_MS).toBe(8_000);
  });

  it('checkServerHealth resolves immediately when backend is warm and healthy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', database: 'connected' }),
    });
    globalThis.fetch = fetchMock as any;

    const onProgress = vi.fn();
    const result = await checkServerHealth({ onProgress, maxWaitMs: 5000 });

    expect(result.online).toBe(true);
    expect(result.database).toBe(true);
    expect(result.isWakingUp).toBe(false);
    expect(onProgress).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('checkServerHealth retries during cold start, triggers onProgress, and succeeds on subsequent attempt', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First call simulates cold start timeout/error
        throw new Error('Connection timeout (Render cold start)');
      }
      return {
        ok: true,
        json: async () => ({ status: 'ok', database: 'connected' }),
      };
    });
    globalThis.fetch = fetchMock as any;

    const onProgress = vi.fn();
    const result = await checkServerHealth({ onProgress, maxWaitMs: 10000 });

    expect(result.online).toBe(true);
    expect(result.database).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ isWakingUp: true })
    );
    expect(callCount).toBe(2);
  });

  it('checkServerHealth reports offline when maxWaitMs expires without success', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Server unavailable'));
    globalThis.fetch = fetchMock as any;

    const onProgress = vi.fn();
    const result = await checkServerHealth({ onProgress, maxWaitMs: 100 });

    expect(result.online).toBe(false);
    expect(result.database).toBe(false);
    expect(result.isWakingUp).toBe(false);
  });

  it('fetchRoundDrafts handles 403 restricted round gracefully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Ronde confidentielle', isUpcoming: true }),
    });
    globalThis.fetch = fetchMock as any;

    const result = await fetchRoundDrafts(5, '2026-2027', 541);
    expect(result).not.toBeNull();
    expect(result?.isRestricted).toBe(true);
    expect(result?.isUpcoming).toBe(true);
  });
});
