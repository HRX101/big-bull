# Big Bull Car Spa ERP

Enterprise-grade automotive workshop ERP SaaS built on Next.js and Firebase.

## Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Firebase Auth, Firestore, Cloud Functions, Storage, App Check
- **Testing:** Vitest, Playwright, Firebase Emulator Suite

## Architecture

Clean Architecture with feature-driven modules:

```
Presentation → Application → Domain → Infrastructure → Firebase
```

No UI component accesses Firebase directly.

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI (`npx firebase-tools@latest`)

### Setup

```bash
cp .env.example apps/web/.env.local
# Fill NEXT_PUBLIC_FIREBASE_* from Firebase Console (big-bull-car-spa project)

npm install
npm run dev
```

### Emulators

```bash
npm run emulators   # Terminal 1
npm run dev:emu     # Terminal 2 (sets NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true)
```

## Scripts

| Command                    | Description              |
| -------------------------- | ------------------------ |
| `npm run dev`              | Start Next.js dev server |
| `npm run build`            | Build all workspaces     |
| `npm run test`             | Unit tests               |
| `npm run test:integration` | Integration tests        |
| `npm run test:e2e`         | Playwright smoke tests   |
| `npm run typecheck`        | TypeScript check         |
| `npm run lint`             | ESLint                   |

## Firebase Project

- **Project ID:** `big-bull-car-spa`
- **Project Number:** `931079920842`

## Documentation

See [`docs/`](docs/) for architecture, security, deployment, and ADRs.

## License

Proprietary — Big Bull Car Spa
