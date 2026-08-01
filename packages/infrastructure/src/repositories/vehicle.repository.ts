import type { VehicleRepository } from '@car-spa/application';
import type { Vehicle } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapVehicle(id: string, data: Record<string, unknown>): Vehicle {
  return {
    id,
    orgId: String(data.orgId),
    customerId: String(data.customerId),
    brand: String(data.brand),
    model: String(data.model),
    vehicleNumber: String(data.vehicleNumber),
    type: (data.type as Vehicle['type']) || 'car',
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreVehicleRepository implements VehicleRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.vehicles, id));
    if (!snapshot.exists()) return null;
    return mapVehicle(snapshot.id, snapshot.data());
  }

  async findByCustomerId(customerId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.vehicles),
      where('customerId', '==', customerId),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapVehicle(d.id, d.data()));
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.vehicles),
      where('orgId', '==', orgId),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapVehicle(d.id, d.data()));
  }

  async findByNumber(orgId: string, vehicleNumber: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.vehicles),
      where('orgId', '==', orgId),
      where('vehicleNumber', '==', vehicleNumber),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapVehicle(first.id, first.data());
  }

  async create(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.vehicles), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapVehicle(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Vehicle>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.vehicles, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapVehicle(saved.id, saved.data()!);
  }
}
