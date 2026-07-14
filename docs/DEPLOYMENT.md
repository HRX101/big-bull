# Deployment

## Environments

| Branch    | Environment | Target                    |
| --------- | ----------- | ------------------------- |
| `develop` | Staging     | Preview deploy (optional) |
| `main`    | Production  | Production deploy         |

## Firebase Auth email links (dynamic)

Email verification and password-reset links are generated at runtime via Firebase `ActionCodeSettings`:

- **Default:** uses the current browser origin (`window.location.origin`) + `/auth/action`
- **Override:** set `NEXT_PUBLIC_APP_URL` in each environment (Vercel preview/production)

Examples:

```bash
# Local (optional — auto-detected from browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://app.your-domain.com
```

**Firebase Console setup (one-time):**

1. Authentication → Settings → **Authorized domains** — add `localhost`, production domain, and Vercel preview domains (`*.vercel.app`) if needed.
2. Authentication → Templates → **Reset action URL to default** (or production URL as fallback). Per-environment routing is handled in code via `ActionCodeSettings`, not manual Console edits per machine.

**After changing `NEXT_PUBLIC_APP_URL`, resend verification emails** — old links still point to the previous origin.

## Firebase

```bash
npx firebase-tools@latest use big-bull-car-spa
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage,functions
```

## Next.js (Vercel recommended)

1. Link repository to Vercel
2. Set root directory to `apps/web`
3. Configure `NEXT_PUBLIC_FIREBASE_*` and optionally `NEXT_PUBLIC_APP_URL` environment variables
4. Enable preview deployments on PRs to `develop`

## Branch Protection

- `main` and `develop` are protected
- Feature branches target `develop` only
- Require PR approval and passing CI

## Emulator Data

Export/import via `firebase/emulator-data/` for reproducible local state.
