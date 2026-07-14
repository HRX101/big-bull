import type { AuthSession } from '@car-spa/domain';
import type { Permission, UserRole } from '@car-spa/shared';
import { assertPermission } from '@car-spa/shared';

export interface OrgContext {
  orgId: string;
  userId: string;
  role: UserRole;
}

export function requireOrgContext(session: AuthSession | null): OrgContext {
  if (!session?.orgId || !session.role) {
    throw new Error('Organization context required');
  }
  return { orgId: session.orgId, userId: session.userId, role: session.role };
}

export function requirePermission(ctx: OrgContext, permission: Permission): void {
  assertPermission(ctx.role, permission);
}
