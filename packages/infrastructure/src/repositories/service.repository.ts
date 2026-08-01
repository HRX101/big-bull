import type { ServiceRepository } from '@car-spa/application';
import type { Service } from '@car-spa/domain';
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

function mapService(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    description: data.description ? String(data.description) : null,
    price: Number(data.price) || 0,
    active: data.active !== false,
    sortOrder: Number(data.sortOrder) || 0,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreServiceRepository implements ServiceRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.services, id));
    if (!snapshot.exists()) return null;
    return mapService(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.services),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapService(d.id, d.data()));
  }

  async create(data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.services), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapService(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Service>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.services, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapService(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.services, id));
  }
}
