import type { POSSaleRepository } from '@car-spa/application';
import type { POSSale } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapSale(id: string, data: Record<string, unknown>): POSSale {
  return {
    id,
    orgId: String(data.orgId),
    customerId: data.customerId ? String(data.customerId) : null,
    items: Array.isArray(data.items)
      ? data.items.map((i: Record<string, unknown>) => ({
          id: String(i.id),
          saleId: String(i.saleId) || id,
          itemId: String(i.itemId),
          itemName: String(i.itemName),
          quantity: Number(i.quantity) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          totalPrice: Number(i.totalPrice) || 0,
          serialNumbers: Array.isArray(i.serialNumbers) ? i.serialNumbers.map(String) : null,
        }))
      : [],
    totalAmount: Number(data.totalAmount) || 0,
    paymentMode: (data.paymentMode as POSSale['paymentMode']) || 'CASH',
    receiptNumber: data.receiptNumber
      ? String(data.receiptNumber)
      : `RCT-${id.slice(0, 8).toUpperCase()}`,
    receiptUrl: data.receiptUrl ? String(data.receiptUrl) : null,
    createdBy: String(data.createdBy),
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestorePOSSaleRepository implements POSSaleRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.posSales, id));
    if (!snapshot.exists()) return null;
    return mapSale(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string, options?: { limit?: number; offset?: string }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.posSales),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapSale(d.id, d.data()));
  }

  async create(data: Omit<POSSale, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.posSales), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapSale(saved.id, saved.data()!);
  }

  async createSaleBatch(input: Parameters<POSSaleRepository['createSaleBatch']>[0]) {
    const db = getFirebaseDb();
    const saleRef = doc(collection(db, COLLECTIONS.posSales));
    const batch = writeBatch(db);

    batch.set(saleRef, {
      orgId: input.orgId,
      customerId: input.customerId,
      items: input.items.map((i) => ({ ...i, saleId: saleRef.id })),
      totalAmount: input.totalAmount,
      paymentMode: input.paymentMode,
      receiptNumber: input.receiptNumber,
      receiptUrl: null,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
    });

    for (const movement of input.movements) {
      batch.set(doc(collection(db, COLLECTIONS.stockMovements)), {
        ...movement,
        referenceId: saleRef.id,
        createdAt: serverTimestamp(),
      });
    }

    for (const delta of input.stockDeltas) {
      batch.update(doc(db, COLLECTIONS.products, delta.productId), {
        currentStock: increment(delta.delta),
      });
    }

    for (const serializedItemId of input.serializedItemIds ?? []) {
      batch.update(doc(db, COLLECTIONS.serializedItems, serializedItemId), {
        isAvailable: false,
        updatedAt: serverTimestamp(),
      });
    }

    if (input.customerId && input.customerSpendDelta) {
      batch.update(doc(db, COLLECTIONS.customers, input.customerId), {
        totalSpend: increment(input.customerSpendDelta),
      });
    }

    if (input.audit) {
      batch.set(doc(collection(db, COLLECTIONS.auditLogs)), {
        orgId: input.orgId,
        actorId: input.audit.actorId,
        action: input.audit.action,
        resourceType: input.audit.resourceType,
        resourceId: saleRef.id,
        metadata: input.audit.metadata ?? {},
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      id: saleRef.id,
      orgId: input.orgId,
      customerId: input.customerId,
      items: input.items.map((i) => ({ ...i, saleId: saleRef.id })),
      totalAmount: input.totalAmount,
      paymentMode: input.paymentMode,
      receiptNumber: input.receiptNumber,
      receiptUrl: null,
      createdBy: input.createdBy,
      createdAt: new Date(),
    } as POSSale;
  }

  async getDailyTotal(orgId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.posSales),
      where('orgId', '==', orgId),
      where('createdAt', '>=', startOfDay),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.reduce((sum, d) => sum + (Number(d.data().totalAmount) || 0), 0);
  }

  async getMonthlyTotal(orgId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.posSales),
      where('orgId', '==', orgId),
      where('createdAt', '>=', startOfMonth),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.reduce((sum, d) => sum + (Number(d.data().totalAmount) || 0), 0);
  }
}
