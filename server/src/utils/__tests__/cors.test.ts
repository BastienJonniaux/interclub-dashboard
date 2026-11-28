import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../cors';

describe('CORS Configuration - isAllowedOrigin', () => {
  it('allows requests with undefined/empty origin (direct browser access, server-to-server, curl)', () => {
    assert.equal(isAllowedOrigin(undefined), true);
    assert.equal(isAllowedOrigin(''), true);
  });

  it('allows production Vercel frontend origin', () => {
    assert.equal(isAllowedOrigin('https://interclub-dashboard.vercel.app'), true);
    assert.equal(isAllowedOrigin('https://interclub-dashboard.vercel.app/'), true);
  });

  it('allows Vercel preview branch deployments', () => {
    assert.equal(isAllowedOrigin('https://interclub-dashboard-git-main-bastien.vercel.app'), true);
    assert.equal(isAllowedOrigin('https://interclub-dashboard-feat-123.vercel.app'), true);
  });

  it('allows localhost development origins', () => {
    assert.equal(isAllowedOrigin('http://localhost:5173'), true);
    assert.equal(isAllowedOrigin('http://localhost:3000'), true);
    assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
  });

  it('rejects unauthorized external origins', () => {
    assert.equal(isAllowedOrigin('https://malicious-site.com'), false);
    assert.equal(isAllowedOrigin('https://fake-interclub-dashboard.com'), false);
  });
});
