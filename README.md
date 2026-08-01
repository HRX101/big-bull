# Big Bull Car Spa ERP

Enterprise-grade automotive workshop ERP SaaS for car/bike service centers.
Built on **Next.js 15 + Firebase** with Clean Architecture.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod
- **Backend:** Firebase Auth, Firestore (NoSQL), Cloud Functions (v2), Storage, App Check
- **Testing:** Vitest (unit), Playwright (E2E), Firebase Emulator Suite (integration)
- **Infrastructure:** Docker, Firebase Emulators, GitHub Actions CI

## Architecture

Clean Architecture with feature-driven modules and org-scoped multi-tenancy:

```
Presentation → Application → Domain → Infrastructure → Firebase
```

- **`packages/shared/`** — Permissions (RBAC), constants, Result type
- **`packages/domain/`** — Entities, Zod validation schemas, auth helpers
- **`packages/application/`** — Use cases, repository ports (interfaces)
- **`packages/infrastructure/`** — Firebase adapters, Firestore repositories, DI container

### Modules (all implemented)

| Module | Description | Owner | Employee |
|--------|-------------|-------|----------|
| Dashboard | Today's stats, task status chart, recent activity | ✓ | ✓ |
| Vehicle Tasks | Kanban board, multi-step wizard, status change with notes | ✓ | ✓ |
| Inventory | Categories with flexible attributes, items, stock movements | ✓ | Read |
| POS | Cart-based selling, auto-decrement stock | ✓ | ✓ |
| Customers | Unified list, dedup by phone, spend/visit history | ✓ | ✓ |
| Employees | Add/remove, toggle active, leave requests | ✓ | Self-only |
| Mechanics | Ledger (DEBIT/CREDIT), balance tracking, enter sales | ✓ | Read |
| Payroll | Salary generation with auto-deduction, approve/paid workflow | ✓ | Read |
| Settings | Store config, services, password change | ✓ | Limited |

### Roles & Access

- **Owner** — full access to all modules
- **Employee** — create/update tasks, use POS, view customers/mechanics, raise requests

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

```bash
cp .env.example apps/web/.env.local
# Fill NEXT_PUBLIC_FIREBASE_* from Firebase Console

npm install
npm run dev
```

### Using Firebase Emulators

```bash
npm run dev:emu
```

### Docker

```bash
docker-compose up
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build all workspaces |
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | Firestore rules tests |
| `npm run test:e2e` | Playwright tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Environment Variables

See [.env.example](.env.example) for all required and optional variables.

Key variables:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase project credentials (required)
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` — set `true` for emulator development
- WhatsApp API keys (optional) — for customer notifications

## WhatsApp Notifications

Customer status update notifications are sent via Firebase Cloud Function when a task status event is created.

1. **Meta WhatsApp Cloud API** — set `whatsappProvider: 'META'` in Settings
2. **Disabled** — set `whatsappProvider: 'NONE'` (default)

The `onTaskStatusChange` function triggers on `taskStatusEvents` creation, looks up customer phone, and sends a template message.

**Setup:**
1. Create a WhatsApp Business Account at [developers.facebook.com](https://developers.facebook.com)
2. Get API Key and Phone Number ID
3. Create template `vehicle_task_update` with body params: `{{1}}` (name), `{{2}}` (status), `{{3}}` (note)
4. Set values in Settings → Store Settings

## Assumptions & Design Decisions

1. **Database**: Firestore (NoSQL) — follows existing convention
2. **Auth**: Firebase Auth with custom claims — not JWT
3. **Task Status**: One status per task overall. Schema supports per-service sub-statuses via `serviceIds`.
4. **Leave Policy**: Default `UNPAID` — all leave deducts unless `leaveType: 'PAID'`. Configurable.
5. **Currency**: INR (₹) with configurable tax rate
6. **WhatsApp**: Meta Cloud API with pre-approved templates. Fallback to `NONE`.
7. **PDF Generation**: Receipt URLs stored on records; stub ready for Cloud Function integration.

## Project Structure

```
apps/web/                 # Next.js 15 application
├── src/app/              # App Router pages
├── src/features/         # Feature modules
├── src/components/       # Shared shadcn/ui components
└── src/providers/        # Firebase, Auth, Query, Theme providers

packages/
├── shared/               # Permissions, constants, Result type
├── domain/               # Entities, Zod schemas
├── application/          # Use cases, repository ports
└── infrastructure/       # Firebase adapters, repositories

functions/                # Cloud Functions (v2)
firebase/                 # Security rules, indexes
e2e/                      # Playwright tests
```

## Documentation

See [`docs/`](docs/) for architecture, security, deployment, and ADRs.

## License

Proprietary — Big Bull Car Spa
