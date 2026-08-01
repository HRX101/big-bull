import type { StockMovementRepository } from '@car-spa/application';
import type { StockMovement } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapMovement(id: string, data: Record<string, unknown>): StockMovement {
  return {
    id,
    orgId: String(data.orgId),
    productId: String(data.productId),
    type: (data.type as StockMovement['type']) || 'RESTOCK_IN',
    quantity: Number(data.quantity) || 0,
    note: String(data.note || ''),
    referenceId: data.referenceId ? String(data.referenceId) : null,
    supplierId: data.supplierId ? String(data.supplierId) : null,
    actorId: String(data.actorId),
    serialNumbers: Array.isArray(data.serialNumbers) ? data.serialNumbers.map(String) : null,
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreStockMovementRepository implements StockMovementRepository {
  async findByProductId(productId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.stockMovements),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapMovement(d.id, d.data()));
  }

  async findByOrgId(orgId: string, options?: { limit?: number; productId?: string }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.stockMovements),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.productId) q = query(q, where('productId', '==', options.productId));
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapMovement(d.id, d.data()));
  }

  async create(data: Omit<StockMovement, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.stockMovements), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return {
      id: ref.id,
      orgId: data.orgId,
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      note: data.note,
      referenceId: data.referenceId ?? null,
      supplierId: data.supplierId ?? null,
      actorId: data.actorId,
      serialNumbers: data.serialNumbers ?? null,
      createdAt: new Date(),
    };
  }

  async getDerivedStock(productId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.stockMovements),
      where('productId', '==', productId),
    );
    const snapshot = await getDocs(q);
    let stock = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const type = String(data.type || '');
      const quantity = Number(data.quantity) || 0;
      if (type === 'RESTOCK_IN') {
        stock += quantity;
      } else {
        stock -= quantity;
      }
    }
    return stock;
  }
}
