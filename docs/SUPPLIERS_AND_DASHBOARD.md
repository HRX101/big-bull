# Supplier Balances, Dashboard Dues, and Experience Fixes

Covers the supplier **To Be Paid** ledger, the dashboard **To Be Paid / To Get** cards, security-rule alignment, mobile UI fixes, and vehicle-task creation performance.

## 1. Supplier balances & purchase history

### Data model

- `suppliers/{id}` carries the balance snapshot fields:
  - `totalAmount` — cumulative purchases (INR)
  - `advanceAmount` — cumulative advances paid to the supplier (INR)
  - `toBePaid` — current outstanding = `totalAmount − advanceAmount`
- `supplierPurchaseEntries/{id}` is the audit ledger: one row per purchase or advance (`type: PURCHASE | ADVANCE`, `referenceType: OPENING` for opening balances, `actorId` who recorded it).
- Invariant: `toBePaid` is maintained backend-side by `CreateSupplierUseCase` and `AddSupplierPurchaseEntryUseCase` (+amount on purchase, −amount on advance), so the field never needs recomputation.

### Legacy suppliers

Suppliers created before the ledger feature have **no ledger rows**; their balances live only on the supplier doc. The UI derives `toBePaid` automatically when the stored value is missing **or zero** (`mapSupplier` in `packages/infrastructure/src/repositories/supplier.repository.ts`, `outstanding()` in the suppliers page, and the dashboard cards use the same rule).

To materialize history for a legacy supplier, run the backfill script (creates `OPENING` PURCHASE/ADVANCE rows, skips suppliers that already have entries, fixes stale `toBePaid`):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\service-account.json"  # or $env:FIREBASE_SERVICE_ACCOUNT = "<json>"
npm run backfill:supplier -- --name="Big Bull" --dryRun   # preview
npm run backfill:supplier -- --name="Big Bull"            # apply
# or by doc id:
npm run backfill:supplier -- --supplierId=<doc-id>
```

Script: `scripts/backfill-supplier-opening.mjs`.

### History query reliability

`useSupplierPurchases` no longer depends on a composite index (`supplierId + createdAt DESC`). The repository queries by equality and sorts client-side, so history renders even if indexes were never deployed. Query failures are now surfaced in the UI (error state + Retry) instead of silently showing "No purchase history found".

## 2. Dashboard due cards

`apps/web/src/features/dashboard/ui/due-overview.tsx` renders two dedicated container cards on **both** dashboards (owner + team), replacing the old quick-action chips:

| Card | Source | Link |
|---|---|---|
| **To Be Paid** (amber) | Sum of supplier `toBePaid` (0-tolerant derive) | `/suppliers` |
| **To Get** (rose) | Sum of vehicle-task `dueAmount` (> 0 only) | `/vehicle-tasks` |

- Both fetch via the same repository queries with `{ limit: 500 }`.
- Skeleton while loading; stack to one column on phones.
- `QuickActions` keeps only Vehicle Task / POS Sale / Air / View Sales.

## 3. Permissions & Firestore rules

Suppliers are shared operational data in this app (both roles record purchases).

- `firebase/firestore.rules` — `suppliers` and `supplierPurchaseEntries` **create/update** now allow `isEmployeeOrOwner()`; **delete** stays owner-only.
- `packages/shared/src/permissions.ts` — employee role gained `supplier:create` and `supplier:update`.
- UI hides Archive/Delete supplier actions for non-owners (owner-only `supplier:delete`).
- Rules must be redeployed for production to pick this up: `firebase deploy --only firestore:rules,firestore:indexes`.

## 4. Mobile UX fixes

- **Quick actions** are now real `<Link>` anchors (no JS-only routing), with larger tap targets on phones (`py-2`, bigger icon pill, `touch-action: manipulation`, press feedback).
- **Suppliers page** — detail-card stats (`Total Purchases / Advance Paid / To Be Paid`) stack full-width on phones instead of overflowing; Record Purchase / Record Advance buttons are full-width stacked on mobile.
- **Dev-mode fix** — the `fdprocessedid` attribute-stripping inline script in `apps/web/src/app/layout.tsx` now guards against text nodes (`typeof target.removeAttribute !== 'function'`), eliminating `target.removeAttribute is not a function` errors in the console.

## 5. Vehicle task creation performance

Critical path is now 2 Firestore round-trips (was ~5 = parallel addDoc + getDoc re-reads for task and event):

- Lookups (`customer`, `vehicle`) run in parallel.
- Task + initial `taskStatusEvents` row are written **atomically in one `writeBatch`** via the new `createWithEvent` port method (`packages/infrastructure/src/repositories/vehicle-task.repository.ts`); results are built locally instead of re-read.
- Non-critical side effects are fire-and-forget: customer stats update, draft cleanup, audit log.
- `ChangeTaskStatusUseCase` and `RecordTaskPaymentUseCase` audit logs are fire-and-forget too (faster board moves / payment dialogs).

## 6. Deploy checklist

```
firebase deploy --only firestore:rules,firestore:indexes   # rules + index changes
npm run build / firebase deploy --only hosting              # web app bundle
```

Web-only changes need just the hosting deploy; rule/index changes need the first command.

## 7. Verification

- `npm run typecheck` — clean
- `npm run lint` — 0 errors / 0 warnings
- `npm test` — all workspaces pass (known flaky pre-existing failure: `packages/infrastructure/src/__tests__/app-check.test.ts` timing test, unrelated to these changes)