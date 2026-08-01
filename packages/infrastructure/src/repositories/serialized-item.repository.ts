import type { SerializedItemRepository } from '@car-spa/application';
import type { SerializedItem } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
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
    return { id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() };
  }

  async bulkCreate(data: Array<Omit<SerializedItem, 'id' | 'createdAt' | 'updatedAt'>>) {
    if (data.length === 0) return [];
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    const results: SerializedItem[] = [];
    for (const item of data) {
      const ref = doc(collection(db, COLLECTIONS.serializedItems));
      batch.set(ref, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      results.push({ id: ref.id, ...item, createdAt: new Date(), updatedAt: new Date() });
    }
    await batch.commit();
    return results;
  }

  async update(id: string, data: Partial<SerializedItem>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.serializedItems, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapItem(saved.id, saved.data()!);
  }

  async createSerializedRestock(input: {
    orgId: string;
    productId: string;
    serialNumbers: string[];
    note?: string;
    actorId: string;
  }) {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    const items: SerializedItem[] = [];
    for (const serialNumber of input.serialNumbers) {
      const ref = doc(collection(db, COLLECTIONS.serializedItems));
      batch.set(ref, {
        orgId: input.orgId,
        productId: input.productId,
        serialNumber,
        isAvailable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      items.push({ id: ref.id, orgId: input.orgId, productId: input.productId, serialNumber, isAvailable: true, createdAt: new Date(), updatedAt: new Date() });
    }
    const movementRef = doc(collection(db, COLLECTIONS.stockMovements));
    batch.set(movementRef, {
      orgId: input.orgId,
      productId: input.productId,
      type: 'RESTOCK_IN',
      quantity: input.serialNumbers.length,
      note: input.note ?? '',
      referenceId: null,
      supplierId: null,
      actorId: input.actorId,
      serialNumbers: input.serialNumbers,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, COLLECTIONS.products, input.productId), {
      currentStock: increment(input.serialNumbers.length),
    });
    batch.set(doc(collection(db, COLLECTIONS.auditLogs)), {
      orgId: input.orgId,
      actorId: input.actorId,
      action: 'stockMovement.create',
      resourceType: 'stockMovement',
      resourceId: movementRef.id,
      metadata: { productId: input.productId, type: 'RESTOCK_IN', quantity: input.serialNumbers.length, serialized: true },
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return { items, movementId: movementRef.id };
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.serializedItems, id));
  }
}
