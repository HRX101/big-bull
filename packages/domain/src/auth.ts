import type { UserRole } from '@car-spa/shared';

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  orgId: string | null;
  role: UserRole | null;
}

export function isAuthenticated(session: AuthSession | null): session is AuthSession {
  return session !== null;
}

export function hasOrgContext(session: AuthSession): boolean {
  return session.orgId !== null && session.role !== null;
}

export function requiresOnboarding(session: AuthSession): boolean {
  return session.emailVerified && !hasOrgContext(session);
}
