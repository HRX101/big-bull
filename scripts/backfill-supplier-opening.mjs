/*
 * Backfill opening purchase-history entries for suppliers that were created
 * before the supplierPurchaseEntries ledger existed.
 *
 * For each matched supplier it:
 *   1. Skips suppliers that already have any ledger entries (idempotent).
 *   2. Creates an opening PURCHASE entry for totalAmount (if > 0).
 *   3. Creates an opening ADVANCE entry for advanceAmount (if > 0).
 *   4. Fixes a stale toBePaid (0/missing) to totalAmount - advanceAmount.
 *
 * Credentials: FIREBASE_SERVICE_ACCOUNT (JSON string) or Application Default
 * Credentials. Project: --project flag or NEXT_PUBLIC_FIREBASE_PROJECT_ID.
 *
 * Usage:
 *   node scripts/backfill-supplier-opening.mjs --supplierId=<doc-id>
 *   node scripts/backfill-supplier-opening.mjs --name="Big Bull"
 *   node scripts/backfill-supplier-opening.mjs --name="Big Bull" --dryRun
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const supplierIdArg = args.find((a) => a.startsWith('--supplierId='))?.split('=')[1];
const nameArg = args.find((a) => a.startsWith('--name='))?.split('=')[1];
const projectArg = args.find((a) => a.startsWith('--project='))?.split('=')[1] ?? '';
const dryRun = args.includes('--dryRun');

if (!supplierIdArg && !nameArg) {
  console.error(
    'Usage: node scripts/backfill-supplier-opening.mjs --supplierId=<id> | --name=<name> [--dryRun]',
  );
  process.exit(1);
}

function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) return apps[0];

  const projectId = projectArg || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'big-bull-car-spa';
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  return serviceAccountJson
    ? initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), projectId })
    : initializeApp({ projectId });
}

async function main() {
  const adminApp = getAdminApp();
  const db = getFirestore(adminApp);

  const suppliers = [];
  if (supplierIdArg) {
    const snap = await db.doc(`suppliers/${supplierIdArg}`).get();
    if (!snap.exists) {
      console.error(`Supplier "${supplierIdArg}" not found.`);
      process.exit(1);
    }
    suppliers.push({ id: snap.id, ...snap.data() });
  } else {
    const all = await db.collection('suppliers').get();
    for (const s of all.docs) {
      const name = String(s.data().name ?? '');
      if (name.toLowerCase().includes(nameArg.toLowerCase())) {
        suppliers.push({ id: s.id, ...s.data() });
      }
    }
    if (suppliers.length === 0) {
      console.error(`No suppliers match name "${nameArg}".`);
      process.exit(1);
    }
  }

  console.log(`Matched ${suppliers.length} supplier(s):`);
  for (const s of suppliers) {
    console.log(
      `  - ${s.id}  ${s.name}  (total=${s.totalAmount ?? 0}, advance=${s.advanceAmount ?? 0}, toBePaid=${s.toBePaid ?? 'n/a'})`,
    );
  }
  console.log(dryRun ? 'DRY RUN — no writes will be made.\n' : '');

  for (const s of suppliers) {
    const existing = await db
      .collection('supplierPurchaseEntries')
      .where('supplierId', '==', s.id)
      .limit(1)
      .get();
    if (existing.size > 0) {
      console.log(`=> ${s.name}: already has entries — skipping (idempotent).`);
      continue;
    }

    const total = Number(s.totalAmount) || 0;
    const advance = Number(s.advanceAmount) || 0;

    if (total <= 0 && advance <= 0) {
      console.log(`=> ${s.name}: no balances to backfill — skipping.`);
      continue;
    }

    console.log(`=> ${s.name}: backfilling...`);
    if (dryRun) continue;

    const now = Timestamp.now();
    if (total > 0) {
      await db.collection('supplierPurchaseEntries').add({
        orgId: s.orgId,
        supplierId: s.id,
        type: 'PURCHASE',
        amount: total,
        description: 'Opening balance',
        referenceType: 'OPENING',
        referenceId: null,
        actorId: 'backfill',
        createdAt: now,
      });
      console.log(`   + PURCHASE entry: ${total}`);
    }
    if (advance > 0) {
      await db.collection('supplierPurchaseEntries').add({
        orgId: s.orgId,
        supplierId: s.id,
        type: 'ADVANCE',
        amount: advance,
        description: 'Opening advance',
        referenceType: 'OPENING',
        referenceId: null,
        actorId: 'backfill',
        createdAt: Timestamp.fromMillis(now.toMillis() + 1000),
      });
      console.log(`   + ADVANCE entry: ${advance}`);
    }

    const derived = total - advance;
    const storedToBePaid = s.toBePaid == null ? 0 : Number(s.toBePaid);
    if (storedToBePaid === 0 && derived !== 0) {
      await db.doc(`suppliers/${s.id}`).update({ toBePaid: derived });
      console.log(`   ~ toBePaid fixed: 0 -> ${derived}`);
    }
  }

  console.log('\nDone. Open the suppliers page and select the supplier to verify purchase history.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});