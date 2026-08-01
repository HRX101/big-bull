import type { SerializedItemRepository } from '@car-spa/application';
import type { SerializedItem } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapItem(id: string, data: Record<string, unknown>): SerializedItem {
  return {
    id,
    orgId: String(data.orgId),
    productId: String(data.productId),
    serialNumber: String(data.serialNumber),
    isAvailable: data.isAvailable !== false,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreSerializedItemRepository implements SerializedItemRepository {
  async findByProductId(productId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.serializedItems),
      where('productId', '==', productId),
      orderBy('serialNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapItem(d.id, d.data()));
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.serializedItems),
      where('orgId', '==', orgId),
      orderBy('serialNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapItem(d.id, d.data()));
  }

  async findAvailableByProductId(productId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.serializedItems),
      where('productId', '==', productId),
      where('isAvailable', '==', true),
      orderBy('serialNumber', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapItem(d.id, d.data()));
  }

  async create(data: Omit<SerializedItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.serializedItems), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapItem(saved.id, saved.data()!);
  }

  async bulkCreate(data: Array<Omit<SerializedItem, 'id' | 'createdAt' | 'updatedAt'>>) {
    if (data.length === 0) return [];
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    const refs: Array<{ ref: ReturnType<typeof doc>; data: typeof data[0] }> = [];
    for (const item of data) {
      const ref = doc(collection(db, COLLECTIONS.serializedItems));
      batch.set(ref, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      refs.push({ ref, data: item });
    }
    await batch.commit();
    const results: SerializedItem[] = [];
    for (const { ref, data: itemData } of refs) {
      const saved = await getDoc(ref);
      results.push(mapItem(saved.id, saved.data()!));
    }
    return results;
  }

  async update(id: string, data: Partial<SerializedItem>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.serializedItems, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapItem(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.serializedItems, id));
  }
}
