# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo scaffold with npm workspaces (`apps/web`, `packages/*`, `functions`)
- Clean Architecture layers: domain, application, infrastructure, shared
- Firebase integration for `big-bull-car-spa` (Auth, Firestore, Storage, Functions, App Check, Emulators)
- Multi-tenant data model with `orgId` scoping and custom claims
- Authentication module: email/password, Google sign-in, forgot password, email verification
- Default organization bootstrap flow for Phase 1 single-workshop deployment
- RBAC permission matrix (Owner, Employee)
- Dashboard shell with sidebar, top bar, theme toggle, empty states
- Firestore and Storage security rules with tenancy isolation
- Cloud Function `syncUserClaims` for custom claim management
- Vitest unit tests, integration tests, Playwright smoke tests
- GitHub Actions CI (lint, typecheck, build, test, e2e, CodeQL, Trivy, npm audit)
- Architecture documentation and ADRs
