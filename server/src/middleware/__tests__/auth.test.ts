import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeCompareKeys,
  extractProvidedKey,
  extractAuthorName,
  getDirectorKey,
} from '../auth';
import type { Request } from 'express';

describe('Auth Middleware - safeCompareKeys', () => {
  it('returns true when provided key matches expected key', () => {
    assert.equal(safeCompareKeys('directorSecret2026', 'directorSecret2026'), true);
  });

  it('returns false when provided key differs from expected key', () => {
    assert.equal(safeCompareKeys('wrongSecret12345', 'directorSecret2026'), false);
  });

  it('returns false when strings have different lengths (constant-time evaluation)', () => {
    assert.equal(safeCompareKeys('short', 'muchLongerExpectedSecret'), false);
    assert.equal(safeCompareKeys('muchLongerExpectedSecret', 'short'), false);
  });

  it('returns false for empty or falsy inputs', () => {
    assert.equal(safeCompareKeys('', 'someSecret'), false);
    assert.equal(safeCompareKeys('someSecret', ''), false);
    assert.equal(safeCompareKeys('', ''), false);
  });
});

describe('Auth Middleware - extractProvidedKey', () => {
  it('extracts key from x-director-key header', () => {
    const req = {
      headers: { 'x-director-key': 'myHeaderSecret' },
      query: {},
    } as unknown as Request;

    const result = extractProvidedKey(req);
    assert.equal(result.key, 'myHeaderSecret');
    assert.equal(result.rejectedFromQuery, false);
  });

  it('extracts key from Authorization: Bearer header', () => {
    const req = {
      headers: { authorization: 'Bearer bearerSecretToken' },
      query: {},
    } as unknown as Request;

    const result = extractProvidedKey(req);
    assert.equal(result.key, 'bearerSecretToken');
    assert.equal(result.rejectedFromQuery, false);
  });

  it('rejects keys passed via query string (directorKey)', () => {
    const req = {
      headers: {},
      query: { directorKey: 'insecureUrlKey' },
    } as unknown as Request;

    const result = extractProvidedKey(req);
    assert.equal(result.key, null);
    assert.equal(result.rejectedFromQuery, true);
  });

  it('returns null when no key is provided', () => {
    const req = {
      headers: {},
      query: {},
    } as unknown as Request;

    const result = extractProvidedKey(req);
    assert.equal(result.key, null);
    assert.equal(result.rejectedFromQuery, false);
  });
});

describe('Auth Middleware - extractAuthorName', () => {
  it('extracts author from x-author-name header', () => {
    const req = {
      headers: { 'x-author-name': 'Laurent' },
      body: {},
    } as unknown as Request;

    assert.equal(extractAuthorName(req), 'Laurent');
  });

  it('extracts author from body.savedBy', () => {
    const req = {
      headers: {},
      body: { savedBy: 'Bastien' },
    } as unknown as Request;

    assert.equal(extractAuthorName(req), 'Bastien');
  });

  it('falls back to "Directeur" when no author is provided', () => {
    const req = {
      headers: {},
      body: {},
    } as unknown as Request;

    assert.equal(extractAuthorName(req), 'Directeur');
  });
});

describe('Auth Middleware - getDirectorKey', () => {
  const originalEnv = { ...process.env };

  it('throws in production if DIRECTOR_KEY is absent', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DIRECTOR_KEY;

    assert.throws(() => getDirectorKey(), /DIRECTOR_KEY obligatoire/);

    // Restore
    process.env = { ...originalEnv };
  });

  it('throws in production if DIRECTOR_KEY is too short (< 8 chars)', () => {
    process.env.NODE_ENV = 'production';
    process.env.DIRECTOR_KEY = 'short';

    assert.throws(() => getDirectorKey(), /trop courte/);

    // Restore
    process.env = { ...originalEnv };
  });

  it('returns configured key in production when valid', () => {
    process.env.NODE_ENV = 'production';
    process.env.DIRECTOR_KEY = 'validSecureKey2026';

    assert.equal(getDirectorKey(), 'validSecureKey2026');

    // Restore
    process.env = { ...originalEnv };
  });
});
