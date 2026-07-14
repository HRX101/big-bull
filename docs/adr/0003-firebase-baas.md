# ADR 0003: Firebase as Backend-as-a-Service

## Status

Accepted

## Context

Need rapid development with managed auth, database, storage, and serverless functions while maintaining security and scalability.

## Decision

Use Firebase (existing project `big-bull-car-spa`) for:

- Authentication (Email/Password, Google)
- Firestore (primary database)
- Cloud Functions (server-side business logic)
- Storage (receipts, images, documents)
- App Check (abuse protection)
- Emulator Suite (local development)

Reuse existing web app registration; do not duplicate Firebase resources.

## Consequences

- Vendor lock-in mitigated by repository pattern
- All server-side logic in Cloud Functions, not client
- Emulator Suite required for integration testing
