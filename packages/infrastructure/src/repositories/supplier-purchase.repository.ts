import type { SupplierPurchaseRepository } from '@car-spa/application';
import type { SupplierPurchaseEntry } from '@car-spa/domain';
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

function mapEntry(id: string, data: Record<string, unknown>): SupplierPurchaseEntry {
  return {
    id,
    orgId: String(data.orgId),
    supplierId: String(data.supplierId),
    type: (data.type as SupplierPurchaseEntry['type']) || 'PURCHASE',
    amount: Number(data.amount) || 0,
    description: String(data.description),
    referenceType: data.referenceType ? String(data.referenceType) : null,
    referenceId: data.referenceId ? String(data.referenceId) : null,
    actorId: String(data.actorId),
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreSupplierPurchaseRepository implements SupplierPurchaseRepository {
  async findBySupplierId(supplierId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.supplierPurchaseEntries),
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data()));
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.supplierPurchaseEntries),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data()));
  }

  async create(data: Omit<SupplierPurchaseEntry, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.supplierPurchaseEntries), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapEntry(saved.id, saved.data()!);
  }
}
