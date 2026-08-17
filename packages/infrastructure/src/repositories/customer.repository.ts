import type { CustomerRepository } from '@car-spa/application';
import type { Customer } from '@car-spa/domain';
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
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    phone: String(data.phone),
    email: data.email ? String(data.email) : null,
    address: data.address ? String(data.address) : null,
    totalSpend: Number(data.totalSpend) || 0,
    visitCount: Number(data.visitCount) || 0,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreCustomerRepository implements CustomerRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.customers, id));
    if (!snapshot.exists()) return null;
    return mapCustomer(snapshot.id, snapshot.data());
  }

  async findByPhone(orgId: string, phone: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.customers),
      where('orgId', '==', orgId),
      where('phone', '==', phone),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapCustomer(first.id, first.data());
  }

  async findByOrgId(orgId: string, options?: { limit?: number; offset?: string }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.customers),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapCustomer(d.id, d.data()));
  }

  async search(orgId: string, queryStr: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.customers),
      where('orgId', '==', orgId),
      orderBy('name'),
      firestoreLimit(20),
    );
    const snapshot = await getDocs(q);
    const lower = queryStr.toLowerCase();
    return snapshot.docs
      .map((d) => mapCustomer(d.id, d.data()))
      .filter((c) => c.name.toLowerCase().includes(lower) || c.phone.includes(queryStr));
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.customers), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapCustomer(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Customer>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.customers, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapCustomer(saved.id, saved.data()!);
  }
}
