import type { MechanicLedgerRepository } from '@car-spa/application';
import type { MechanicLedgerEntry } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapEntry(id: string, data: Record<string, unknown>): MechanicLedgerEntry {
  return {
    id,
    orgId: String(data.orgId),
    mechanicId: String(data.mechanicId),
    type: (data.type as MechanicLedgerEntry['type']) || 'DEBIT',
    amount: Number(data.amount) || 0,
    description: String(data.description),
    referenceType: data.referenceType ? String(data.referenceType) : null,
    referenceId: data.referenceId ? String(data.referenceId) : null,
    itemCount: data.itemCount != null ? Number(data.itemCount) : null,
    items: Array.isArray(data.items)
      ? (data.items as Array<Record<string, unknown>>).map((it) => ({
          productId: String(it.productId),
          productName: String(it.productName ?? ''),
          quantity: Number(it.quantity) || 0,
        }))
      : null,
    actorId: String(data.actorId),
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreMechanicLedgerRepository implements MechanicLedgerRepository {
  async findByMechanicId(mechanicId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.mechanicLedgerEntries),
      where('mechanicId', '==', mechanicId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data()));
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.mechanicLedgerEntries),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data()));
  }

  async create(data: Omit<MechanicLedgerEntry, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.mechanicLedgerEntries), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapEntry(saved.id, saved.data()!);
  }
}
