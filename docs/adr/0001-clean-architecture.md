# ADR 0001: Clean Architecture

## Status

Accepted

## Context

Enterprise ERP requires maintainability, testability, and clear separation of concerns across a large codebase.

## Decision

Adopt Clean Architecture (Onion Architecture) with four layers: Presentation, Application, Domain, Infrastructure.

## Consequences

- Domain logic is pure and fully unit-testable
- Firebase is swappable behind repository interfaces
- Slightly more boilerplate per feature, offset by long-term maintainability
