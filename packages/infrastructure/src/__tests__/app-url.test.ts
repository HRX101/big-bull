import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getAppOrigin', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('uses NEXT_PUBLIC_APP_URL when configured', async () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_APP_URL: 'https://app.example.com/' };
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    const { getAppOrigin, getAuthActionUrl } = await import('../firebase/app-url');
    expect(getAppOrigin()).toBe('https://app.example.com');
    expect(getAuthActionUrl()).toBe('https://app.example.com/auth/action');
  });

  it('falls back to window.location.origin', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    const { getAppOrigin } = await import('../firebase/app-url');
    expect(getAppOrigin()).toBe('http://localhost:3000');
  });
});
