export const COLLECTIONS = {
  organizations: 'organizations',
  memberships: 'memberships',
  users: 'users',
  auditLogs: 'auditLogs',
  customers: 'customers',
  vehicles: 'vehicles',
  vehicleTasks: 'vehicleTasks',
  inventoryItems: 'inventoryItems',
  employees: 'employees',
  mechanics: 'mechanics',
  posOrders: 'posOrders',
  payrollEntries: 'payrollEntries',
  notifications: 'notifications',
} as const;

export const DEFAULT_ORG_SLUG = 'big-bull-car-spa';

export const AUTH_ROUTES = {
  signIn: '/auth/sign-in',
  signUp: '/auth/sign-up',
  forgotPassword: '/auth/forgot-password',
  verifyEmail: '/auth/verify-email',
  authAction: '/auth/action',
  onboarding: '/auth/onboarding',
} as const;

export const PROTECTED_ROUTES = {
  dashboard: '/dashboard',
  customers: '/customers',
  vehicles: '/vehicles',
  tasks: '/tasks',
  inventory: '/inventory',
  employees: '/employees',
  mechanics: '/mechanics',
  pos: '/pos',
  payroll: '/payroll',
  auditLogs: '/audit-logs',
  notifications: '/notifications',
  analytics: '/analytics',
  settings: '/settings',
} as const;

export const PUBLIC_ROUTES = [
  '/',
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.verifyEmail,
] as const;

export const NAV_ITEMS = [
  { href: PROTECTED_ROUTES.dashboard, label: 'Dashboard', phase: 1 },
  { href: PROTECTED_ROUTES.customers, label: 'Customers', phase: 2 },
  { href: PROTECTED_ROUTES.vehicles, label: 'Vehicles', phase: 2 },
  { href: PROTECTED_ROUTES.tasks, label: 'Tasks', phase: 2 },
  { href: PROTECTED_ROUTES.auditLogs, label: 'Audit Logs', phase: 2 },
  { href: PROTECTED_ROUTES.notifications, label: 'Notifications', phase: 2 },
  { href: PROTECTED_ROUTES.inventory, label: 'Inventory', phase: 3 },
  { href: PROTECTED_ROUTES.employees, label: 'Employees', phase: 3 },
  { href: PROTECTED_ROUTES.mechanics, label: 'Mechanics', phase: 3 },
  { href: PROTECTED_ROUTES.pos, label: 'POS', phase: 4 },
  { href: PROTECTED_ROUTES.payroll, label: 'Payroll', phase: 4 },
  { href: PROTECTED_ROUTES.analytics, label: 'Analytics', phase: 5 },
  { href: PROTECTED_ROUTES.settings, label: 'Settings', phase: 1 },
] as const;
