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
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'vehicles:read'
  | 'vehicles:create'
  | 'vehicles:update'
  | 'vehicles:delete'
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:transition'
  | 'inventory:read'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'employees:read'
  | 'employees:create'
  | 'employees:update'
  | 'employees:delete'
  | 'mechanics:read'
  | 'mechanics:create'
  | 'mechanics:update'
  | 'mechanics:delete'
  | 'pos:read'
  | 'pos:create'
  | 'pos:update'
  | 'pos:pay'
  | 'payroll:read'
  | 'payroll:create'
  | 'payroll:update'
  | 'payroll:approve'
  | 'notifications:read'
  | 'notifications:update'
  | 'analytics:read';

const OWNER_PERMISSIONS: readonly Permission[] = [
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
  'customers:read',
  'customers:create',
  'customers:update',
  'customers:delete',
  'vehicles:read',
  'vehicles:create',
  'vehicles:update',
  'vehicles:delete',
  'tasks:read',
  'tasks:create',
  'tasks:update',
  'tasks:transition',
  'inventory:read',
  'inventory:create',
  'inventory:update',
  'inventory:delete',
  'employees:read',
  'employees:create',
  'employees:update',
  'employees:delete',
  'mechanics:read',
  'mechanics:create',
  'mechanics:update',
  'mechanics:delete',
  'pos:read',
  'pos:create',
  'pos:update',
  'pos:pay',
  'payroll:read',
  'payroll:create',
  'payroll:update',
  'payroll:approve',
  'notifications:read',
  'notifications:update',
  'analytics:read',
] as const;

const EMPLOYEE_PERMISSIONS: readonly Permission[] = [
  'org:read',
  'membership:read',
  'dashboard:read',
  'settings:read',
  'customers:read',
  'customers:create',
  'customers:update',
  'vehicles:read',
  'vehicles:create',
  'vehicles:update',
  'tasks:read',
  'tasks:create',
  'tasks:update',
  'tasks:transition',
  'inventory:read',
  'inventory:update',
  'employees:read',
  'mechanics:read',
  'pos:read',
  'pos:create',
  'pos:update',
  'pos:pay',
  'payroll:read',
  'notifications:read',
  'notifications:update',
  'analytics:read',
] as const;

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: OWNER_PERMISSIONS,
  employee: EMPLOYEE_PERMISSIONS,
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role "${role}" lacks permission "${permission}"`);
  }
}
