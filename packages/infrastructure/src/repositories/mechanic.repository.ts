import type { MechanicRepository } from '@car-spa/application';
import type { Mechanic } from '@car-spa/domain';
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
  increment,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapMechanic(id: string, data: Record<string, unknown>): Mechanic {
  return {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    storeName: String(data.storeName),
    phone: data.phone ? String(data.phone) : null,
    address: data.address ? String(data.address) : null,
    balance: Number(data.balance) || 0,
    active: data.active !== false,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreMechanicRepository implements MechanicRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.mechanics, id));
    if (!snapshot.exists()) return null;
    return mapMechanic(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.mechanics),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapMechanic(d.id, d.data()));
  }

  async create(data: Omit<Mechanic, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.mechanics), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapMechanic(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Mechanic>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.mechanics, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapMechanic(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.mechanics, id));
  }

  async updateBalance(id: string, delta: number) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.mechanics, id);
    await updateDoc(ref, { balance: increment(delta), updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapMechanic(saved.id, saved.data()!);
  }
}
