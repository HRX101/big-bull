# Testing

## Unit Tests (Vitest)

```bash
npm run test
```

Coverage targets:

- 90% for business logic (as modules grow)
- 100% for critical workflows (auth, payroll, inventory — future phases)

## Integration Tests

```bash
npm run test:integration
```

Tests Firestore rules structure and tenancy policies.

## End-to-End (Playwright)

```bash
npm run test:e2e
```

Smoke tests cover:

- Auth redirect
- Sign-in page render
- Sign-up page render

## Firebase Emulator Suite

```bash
npm run emulators
```

Use `npm run dev:emu` to run Next.js against emulators.

## CI

All tests run on every PR to `develop`.
