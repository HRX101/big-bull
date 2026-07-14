# Contributing

## Git Workflow

```
feature/* → PR → develop → QA → Release → main
```

## Rules

- No direct commits to `main` or `develop`
- Feature branches must target `develop`
- Require at least one approval
- All CI checks must pass before merge
- Use linear history (squash or rebase)
- Delete merged branches

## Code Standards

- TypeScript strict mode
- ESLint strict
- Prettier formatting
- No Firebase imports in UI components
- No business logic in pages
- Every feature includes tests and documentation

## CHANGELOG

Every merge to `develop` must include a CHANGELOG entry under `[Unreleased]`.

## Definition of Done

See project specification for full checklist: architecture compliance, tests, docs, rules, security scan.
