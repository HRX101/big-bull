export const COLLECTIONS = {
  organizations: 'organizations',
  memberships: 'memberships',
  users: 'users',
  auditLogs: 'auditLogs',
} as const;

export const DEFAULT_ORG_SLUG = 'big-bull-car-spa';

export const AUTH_ROUTES = {
  signIn: '/auth/sign-in',
  signUp: '/auth/sign-up',
  forgotPassword: '/auth/forgot-password',
  verifyEmail: '/auth/verify-email',
  onboarding: '/auth/onboarding',
} as const;

export const PROTECTED_ROUTES = {
  dashboard: '/dashboard',
  settings: '/settings',
} as const;

export const PUBLIC_ROUTES = [
  '/',
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.verifyEmail,
] as const;
