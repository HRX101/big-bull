import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'big-bull-car-spa';

const app = initializeApp({ projectId: 'big-bull-car-spa' });
const db = getFirestore(app);

const COLLECTIONS = [
  'products',
  'categories',
  'suppliers',
  'stockMovements',
  'customers',
  'vehicles',
  'vehicleTasks',
  'taskStatusEvents',
  'services',
  'posSales',
  'posSaleItems',
  'mechanics',
  'mechanicLedgerEntries',
  'leaveRequests',
  'salaryRecords',
  'storeSettings',
  'notificationLogs',
  'auditLogs',
  'memberships',
  'users',
];

async function main() {
  console.log('=== Backfill orgId on existing documents ===\n');

  // Step 1: find the first organization to get the orgId
  console.log('1. Looking up organizations...');
  const orgsSnap = await db.collection('organizations').get();
  if (orgsSnap.empty) {
    console.log('No organizations found. Create one through the app first.');
    process.exit(1);
  }
  const orgs = [];
  orgsSnap.forEach(d => orgs.push({ id: d.id, ...d.data() }));
  for (const org of orgs) {
    console.log(`   - id: ${org.id}, slug: ${org.slug || '(no slug)'}`);
  }
  const orgId = orgs[0].id;
  console.log(`   Using orgId: ${orgId}\n`);

  // Step 2: backfill each collection
  let totalUpdated = 0;
  for (const collection of COLLECTIONS) {
    try {
      const snap = await db.collection(collection).get();
      if (snap.empty) {
        console.log(`   ${collection}: empty`);
        continue;
      }
      const batch = db.batch();
      let count = 0;
      snap.forEach(d => {
        const data = d.data();
        if (!data.orgId && d.id !== orgId) {
          batch.update(d.ref, { orgId });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        totalUpdated += count;
        console.log(`   ${collection}: ${snap.size} docs, ${count} missing orgId — updated ✓`);
      } else {
        console.log(`   ${collection}: ${snap.size} docs, all have orgId ✓`);
      }
    } catch (err) {
      console.log(`   ${collection}: ERROR — ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Total documents updated: ${totalUpdated}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
