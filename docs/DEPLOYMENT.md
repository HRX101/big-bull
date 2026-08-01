# Deployment

## Environments

| Branch    | Environment | Target                    |
| --------- | ----------- | ------------------------- |
| `develop` | Staging     | Preview deploy (optional) |
| `main`    | Production  | Production deploy         |

## Firebase

```bash
npx firebase-tools@latest use big-bull-car-spa
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage,functions
```

## Next.js (Vercel recommended)

1. Link repository to Vercel
2. Set root directory to `apps/web`
3. Configure `NEXT_PUBLIC_FIREBASE_*` environment variables
4. Enable preview deployments on PRs to `develop`

## Branch Protection

- `main` and `develop` are protected
- Feature branches target `develop` only
- Require PR approval and passing CI

## Emulator Data

Export/import via `firebase/emulator-data/` for reproducible local state.
