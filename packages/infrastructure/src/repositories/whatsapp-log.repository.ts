import type { WhatsAppLogRepository, WhatsAppLogEntry } from '@car-spa/application';
import { COLLECTIONS } from '@car-spa/shared';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';

export class FirestoreWhatsAppLogRepository implements WhatsAppLogRepository {
  async create(entry: WhatsAppLogEntry) {
    await addDoc(collection(getFirebaseDb(), COLLECTIONS.whatsappLogs), {
      ...entry,
      orgId: entry.storeId,
      createdAt: serverTimestamp(),
    });
  }
}
