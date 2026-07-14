import type { AuditRepository } from '@car-spa/application';
import type { AuditLogEntry } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapAudit(id: string, data: Record<string, unknown>): AuditLogEntry {
  return {
    id,
    orgId: String(data.orgId),
    actorId: String(data.actorId),
    action: String(data.action),
    resourceType: String(data.resourceType),
    resourceId: String(data.resourceId),
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

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

  async listByOrg(orgId: string, max = 100) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.auditLogs),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapAudit(d.id, d.data()));
  }
}
