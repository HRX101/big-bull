import { AUTH_ROUTES } from '@car-spa/shared';

/**
 * Canonical app origin for Firebase email action links.
 * Priority: NEXT_PUBLIC_APP_URL (explicit) → window.location.origin (runtime).
 */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  throw new Error(
    'App origin is not configured. Set NEXT_PUBLIC_APP_URL or call from the browser.',
  );
}

export function getAuthActionUrl(): string {
  return `${getAppOrigin()}${AUTH_ROUTES.authAction}`;
}
