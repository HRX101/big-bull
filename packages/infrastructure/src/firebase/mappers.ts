import type { AuthSession } from '@car-spa/domain';
import type { UserRole } from '@car-spa/shared';
import type { IdTokenResult, User } from 'firebase/auth';

function parseClaims(claims: IdTokenResult['claims']): {
  orgId: string | null;
  role: UserRole | null;
} {
  const orgId = typeof claims.orgId === 'string' ? claims.orgId : null;
  const role = claims.role === 'owner' || claims.role === 'employee' ? claims.role : null;
  return { orgId, role };
}

export async function mapFirebaseUserToSession(user: User): Promise<AuthSession> {
  const tokenResult = await user.getIdTokenResult();
  const { orgId, role } = parseClaims(tokenResult.claims);

  return {
    userId: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email ?? 'User',
    emailVerified: user.emailVerified,
    orgId,
    role,
  };
}

export function toFirestoreTimestamp(date: Date) {
  return date;
}

export function fromFirestoreDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(String(value));
}

export function parseRole(value: unknown): UserRole | null {
  return value === 'owner' || value === 'employee' ? value : null;
}
