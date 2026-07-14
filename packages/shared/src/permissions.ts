export type UserRole = 'owner' | 'employee';

export type Permission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'membership:read'
  | 'membership:create'
  | 'membership:update'
  | 'membership:delete'
  | 'dashboard:read'
  | 'audit:read'
  | 'settings:read'
  | 'settings:update';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [
    'org:read',
    'org:update',
    'org:delete',
    'membership:read',
    'membership:create',
    'membership:update',
    'membership:delete',
    'dashboard:read',
    'audit:read',
    'settings:read',
    'settings:update',
  ],
  employee: ['org:read', 'membership:read', 'dashboard:read', 'settings:read'],
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role "${role}" lacks permission "${permission}"`);
  }
}
