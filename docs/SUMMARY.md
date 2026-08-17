# Codebase Summary

**Big Bull Car Spa ERP** — an enterprise-grade SaaS ERP for automotive (car/bike) service centers, built with **Next.js 15 + Firebase** following Clean Architecture.

## What it does

A multi-tenant management system where a workshop **owner** runs daily operations and **employees** execute them:

- **Vehicle Tasks** — Kanban board and multi-step wizard for tracking jobs (car wash, service) through statuses with notes; each status change can notify the customer via WhatsApp.
- **POS & Inventory** — Cart-based selling with auto stock deduction, product/service catalogs, serialized items, stock movements, suppliers and purchase records.
- **Customers** — Unified customer list with dedup by phone, spend and visit history.
- **Mechanics & Payroll** — Mechanic ledger (DEBIT/CREDIT balance tracking), salary generation with auto-deduction and approve/paid workflow, leave requests.
- **Employees & Settings** — Staff management, store configuration, tax rate (INR), services.
- **Dashboard** — Today's stats, task status chart, recent activity.

## How it's structured

```
apps/web              Next.js 15 App Router frontend (feature-driven modules)
packages/shared       Permissions (RBAC), constants, Result type
packages/domain       Entities + Zod validation schemas
packages/application  Use cases + repository port interfaces
packages/infrastructure  Firebase adapters, Firestore repositories, DI container
functions             Firebase Cloud Functions (v2) — e.g. WhatsApp notifications
firebase              Security rules and indexes
e2e                   Playwright end-to-end tests
docs                  Architecture, security, deployment, ADRs
```

Architecture flows **Presentation → Application → Domain → Infrastructure → Firebase**. Access is role-based: **Owner** gets full access, **Employee** gets scoped access (create/update tasks, use POS, view customers/mechanics, self-service requests).

## Testing

Vitest (unit), Firebase Emulator Suite (Firestore rules/integration), Playwright (E2E), plus GitHub Actions CI and Docker support.
