export const COLLECTIONS = {
  organizations: 'organizations',
  memberships: 'memberships',
  users: 'users',
  auditLogs: 'auditLogs',
  customers: 'customers',
  vehicles: 'vehicles',
  services: 'services',
  vehicleTasks: 'vehicleTasks',
  taskStatusEvents: 'taskStatusEvents',
  categories: 'categories',
  products: 'products',
  stockMovements: 'stockMovements',
  suppliers: 'suppliers',
  posSales: 'posSales',
  posSaleItems: 'posSaleItems',
  mechanics: 'mechanics',
  mechanicLedgerEntries: 'mechanicLedgerEntries',
  supplierPurchaseEntries: 'supplierPurchaseEntries',
  leaveRequests: 'leaveRequests',
  salaryRecords: 'salaryRecords',
  storeSettings: 'storeSettings',
  notificationLogs: 'notificationLogs',
  notificationTemplates: 'notificationTemplates',
  whatsappLogs: 'whatsappLogs',
  whatsappDedupe: 'whatsappDedupe',
  drafts: 'drafts',
  serializedItems: 'serializedItems',
  sequences: 'sequences',
} as const;

export const DEFAULT_ORG_SLUG = 'big-bull-car-spa';

export const AUTH_ROUTES = {
  signIn: '/auth/sign-in',
  signUp: '/auth/sign-up',
  forgotPassword: '/auth/forgot-password',
  verifyEmail: '/auth/verify-email',
  onboarding: '/auth/onboarding',
  authAction: '/auth/action',
} as const;

export const PROTECTED_ROUTES = {
  dashboard: '/dashboard',
  settings: '/settings',
  vehicleTasks: '/vehicle-tasks',
  inventory: '/inventory',
  suppliers: '/suppliers',
  pos: '/pos',
  transactions: '/transactions',
  customers: '/customers',
  employees: '/employees',
  mechanics: '/mechanics',
} as const;

export const PUBLIC_ROUTES = [
  '/',
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.verifyEmail,
] as const;

export const TASK_STATUSES = [
  'RECEIVED',
  'IN_PROGRESS',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const SALARY_STATUSES = ['PENDING', 'APPROVED', 'PAID'] as const;
export type SalaryStatus = (typeof SALARY_STATUSES)[number];

export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const STOCK_MOVEMENT_TYPES = [
  'RESTOCK_IN',
  'MANUAL_OUT',
  'POS_SALE',
  'VEHICLE_TASK_USE',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const UNITS = ['piece', 'litre', 'kg', 'box', 'pack', 'set', 'pair', 'metre'] as const;
export type Unit = (typeof UNITS)[number];
