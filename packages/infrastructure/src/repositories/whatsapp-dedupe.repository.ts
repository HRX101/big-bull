import type { WhatsAppDedupeRepository } from '@car-spa/application';
import { COLLECTIONS } from '@car-spa/shared';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';

export class FirestoreWhatsAppDedupeRepository implements WhatsAppDedupeRepository {
  async acquire(key: string): Promise<boolean> {
    const db = getFirebaseDb();
    const ref = doc(db, COLLECTIONS.whatsappDedupe, key);
    try {
      return await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) return false;
        tx.set(ref, { createdAt: serverTimestamp() });
        return true;
      });
    } catch {
      // Transaction conflict means another invocation claimed the key first.
      return false;
    }
  }
}
