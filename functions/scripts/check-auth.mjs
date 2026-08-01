import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'big-bull-car-spa';

const app = initializeApp({ projectId: 'big-bull-car-spa' });

async function main() {
  console.log('=== Auth Emulator Check ===\n');
  const users = await getAuth().listUsers();
  console.log(`Total users: ${users.users.length}`);
  for (const u of users.users) {
    console.log(`  UID: ${u.uid}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Email verified: ${u.emailVerified}`);
    console.log(`  Custom claims: ${JSON.stringify(u.customClaims)}`);
    console.log();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
