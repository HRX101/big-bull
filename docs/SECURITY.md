# Security

## Authentication

- Firebase Auth with Email/Password and Google Sign-In
- Email verification required before onboarding
- Persistent sessions via Firebase Auth state

## Authorization

- RBAC: Owner (full) vs Employee (read-only for Phase 1)
- Custom claims: `orgId`, `role`
- Firestore rules enforce tenant isolation on every collection

## App Check

- Debug provider for local development
- reCAPTCHA Enterprise for production (configure `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`)

## Headers (CSP)

Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy configured in `next.config.ts`.

## Secret Management

- Firebase config via `NEXT_PUBLIC_FIREBASE_*` environment variables
- Never commit `.env.local` or `project_details.txt`
- Service account keys excluded via `.gitignore`

## Dependency Audits

- `npm audit` and Trivy in CI (non-blocking in Phase 1)
- Dependabot weekly updates

## Principle of Least Privilege

- Employees cannot modify org settings or memberships
- Audit logs are append-only
- Default deny in Firestore and Storage rules
