# ADR 0002: Multi-Tenancy

## Status

Accepted

## Context

The product is a SaaS serving multiple automotive workshops. Phase 1 ships with one default organization but must not require a schema migration to support multiple tenants.

## Decision

- All tenant data scoped by `orgId`
- Custom claims on Firebase Auth tokens: `{ orgId, role }`
- Firestore rules enforce `request.auth.token.orgId == resource.data.orgId`
- Phase 1 bootstraps a single default org; org switcher is a placeholder

## Consequences

- Every new collection must include `orgId`
- Rules and indexes must be tenant-aware from day one
- Org switcher UI deferred to Phase 2+
