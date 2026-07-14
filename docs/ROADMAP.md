# Roadmap

## Phase 1 — Foundation (Current)

- [x] Monorepo scaffold
- [x] Clean Architecture layers
- [x] Firebase platform (Auth, Firestore, Storage, Functions, Emulators)
- [x] Multi-tenant model with default org bootstrap
- [x] Auth + RBAC + protected routes
- [x] Dashboard shell
- [x] CI/CD + documentation

## Phase 2 — Core Operations

- [ ] Customers module
- [ ] Vehicles/Tasks with state machine
- [ ] Audit log UI
- [ ] Notifications plumbing

## Phase 3 — Workforce & Stock

- [ ] Inventory module
- [ ] Employees module
- [ ] Mechanics module

## Phase 4 — Commerce & Payroll

- [ ] POS module
- [ ] Payroll module
- [ ] Receipt generation (Cloud Functions)

## Phase 5 — Hardening

- [ ] Analytics module
- [ ] App Check production enforcement
- [ ] Security scans → blocking
- [ ] 90%+ test coverage across all modules

## Future Module Placeholders

Scaffolded in `apps/web/src/features/`:

- `customers/`
- `vehicles/`
- `inventory/`
- `pos/`
- `employees/`
- `payroll/`
- `mechanics/`
- `notifications/`
- `analytics/`
- `audit-logs/`
