import type { POSSaleRepository } from '@car-spa/application';
import type { POSSale } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
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

function mapSale(id: string, data: Record<string, unknown>): POSSale {
  return {
    id,
    orgId: String(data.orgId),
    customerId: data.customerId ? String(data.customerId) : null,
    items: Array.isArray(data.items) ? data.items.map((i: Record<string, unknown>) => ({
      id: String(i.id),
      saleId: String(i.saleId) || id,
      itemId: String(i.itemId),
      itemName: String(i.itemName),
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      totalPrice: Number(i.totalPrice) || 0,
    })) : [],
    totalAmount: Number(data.totalAmount) || 0,
    paymentMode: (data.paymentMode as POSSale['paymentMode']) || 'CASH',
    receiptNumber: data.receiptNumber ? String(data.receiptNumber) : `RCT-${id.slice(0, 8).toUpperCase()}`,
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
