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
  | 'settings:update'
  | 'customer:read'
  | 'customer:create'
  | 'customer:update'
  | 'vehicleTask:read'
  | 'vehicleTask:create'
  | 'vehicleTask:update'
  | 'vehicleTask:delete'
  | 'inventory:read'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'inventory:viewCost'
  | 'inventory:viewReports'
  | 'supplier:read'
  | 'supplier:create'
  | 'supplier:update'
  | 'supplier:delete'
  | 'pos:read'
  | 'pos:create'
  | 'employee:read'
  | 'employee:create'
  | 'employee:update'
  | 'employee:delete'
  | 'mechanic:read'
  | 'mechanic:create'
  | 'mechanic:update'
  | 'mechanic:delete'
  | 'salary:read'
  | 'salary:create'
  | 'salary:approve'
  | 'leave:read'
  | 'leave:create'
  | 'leave:approve';

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
    'customer:read',
    'customer:create',
    'customer:update',
    'vehicleTask:read',
    'vehicleTask:create',
    'vehicleTask:update',
    'vehicleTask:delete',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:delete',
    'inventory:viewCost',
    'inventory:viewReports',
    'supplier:read',
    'supplier:create',
    'supplier:update',
    'supplier:delete',
    'pos:read',
    'pos:create',
    'employee:read',
    'employee:create',
    'employee:update',
    'employee:delete',
    'mechanic:read',
    'mechanic:create',
    'mechanic:update',
    'mechanic:delete',
    'salary:read',
    'salary:create',
    'salary:approve',
    'leave:read',
    'leave:create',
    'leave:approve',
  ],
  employee: [
    'org:read',
    'membership:read',
    'dashboard:read',
    'settings:read',
    'customer:read',
    'customer:create',
    'vehicleTask:read',
    'vehicleTask:create',
    'vehicleTask:update',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'supplier:read',
    'supplier:create',
    'supplier:update',
    'pos:read',
    'pos:create',
    'employee:read',
    'mechanic:read',
    'salary:read',
    'leave:read',
    'leave:create',
  ],
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role "${role}" lacks permission "${permission}"`);
  }
}
