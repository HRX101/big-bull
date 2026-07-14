# Architecture

## Overview

Big Bull Car Spa ERP follows **Clean Architecture** (Onion Architecture) with **Feature-Driven Development**.

## Layers

| Layer          | Responsibility                       | Location                  |
| -------------- | ------------------------------------ | ------------------------- |
| Presentation   | UI, pages, hooks (no business logic) | `apps/web/src`            |
| Application    | Use cases, ports, orchestration      | `packages/application`    |
| Domain         | Entities, validation, policies       | `packages/domain`         |
| Infrastructure | Firebase adapters, repositories      | `packages/infrastructure` |
| Shared         | Cross-cutting types, permissions     | `packages/shared`         |

## Dependency Rule

Dependencies point inward only. Domain has zero external dependencies.

## Feature Module Structure

```
features/<module>/
├── ui/
├── hooks/
├── application/
├── domain/
├── infrastructure/
├── validation/
├── types/
├── __tests__/
└── docs/
```

## Multi-Tenancy

All tenant data is scoped by `orgId`. Custom claims on Firebase Auth tokens carry `orgId` and `role`.

## State Machines

Vehicle workflow (Phase 2+) uses explicit state machines — no free-text status fields.

## ADRs

- [0001 — Clean Architecture](adr/0001-clean-architecture.md)
- [0002 — Multi-Tenancy](adr/0002-multi-tenancy.md)
- [0003 — Firebase BaaS](adr/0003-firebase-baas.md)
