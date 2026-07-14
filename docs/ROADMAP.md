# Roadmap

## Phase 1 — Foundation

- [x] Monorepo scaffold
- [x] Clean Architecture layers
- [x] Firebase platform (Auth, Firestore, Storage, Functions, Emulators)
- [x] Multi-tenant model with default org bootstrap
- [x] Auth + RBAC + protected routes
- [x] Dashboard shell
- [x] CI/CD + documentation

## Phase 2 — Core Operations

- [x] Customers module
- [x] Vehicles/Tasks with state machine
- [x] Audit log UI
- [x] Notifications plumbing

## Phase 3 — Workforce & Stock

- [x] Inventory module
- [x] Employees module
- [x] Mechanics module

## Phase 4 — Commerce & Payroll

- [x] POS module
- [x] Payroll module
- [x] Receipt generation (Cloud Functions + client fallback)

## Phase 5 — Hardening

- [x] Analytics module
- [x] App Check production enforcement (opt-in via env)
- [x] Security scans → blocking in CI
- [ ] 90%+ test coverage across all modules (ongoing)

## Modules

Implemented in `apps/web/src/features/`:

- `customers/`
- `vehicles/` (includes tasks)
- `inventory/`
- `pos/`
- `employees/`
- `payroll/`
- `mechanics/`
- `notifications/`
- `analytics/`
- `audit-logs/`
