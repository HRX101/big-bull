import type { AuditRepository } from '@car-spa/application';
import { COLLECTIONS } from '@car-spa/shared';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';

export class FirestoreAuditRepository implements AuditRepository {
  async log(entry: {
    orgId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }) {
    await addDoc(collection(getFirebaseDb(), COLLECTIONS.auditLogs), {
      orgId: entry.orgId,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata ?? {},
      createdAt: serverTimestamp(),
    });
  }
}
