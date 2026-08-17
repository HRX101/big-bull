import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('initAppCheck', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('skips App Check when site key is not configured', async () => {
    const { initAppCheck } = await import('../firebase/client');
    const result = initAppCheck();
    expect(result).toBeUndefined();
  });
});
