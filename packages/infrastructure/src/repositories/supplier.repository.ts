import type { SupplierRepository } from '@car-spa/application';
import type { Supplier } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapSupplier(id: string, data: Record<string, unknown>): Supplier {
  const s: Supplier & { isActive?: boolean } = {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    contactPhone: data.contactPhone ? String(data.contactPhone) : null,
    notes: data.notes ? String(data.notes) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
  if (data.isActive !== undefined) s.isActive = Boolean(data.isActive);
  else s.isActive = true;
  return s as Supplier;
}

export class FirestoreSupplierRepository implements SupplierRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.suppliers, id));
    if (!snapshot.exists()) return null;
    return mapSupplier(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.suppliers),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapSupplier(d.id, d.data()));
  }

  async findByPhone(orgId: string, phone: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.suppliers),
      where('orgId', '==', orgId),
      where('contactPhone', '==', phone),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapSupplier(first.id, first.data());
  }

  async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.suppliers), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapSupplier(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Supplier>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.suppliers, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapSupplier(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.suppliers, id));
  }
}
