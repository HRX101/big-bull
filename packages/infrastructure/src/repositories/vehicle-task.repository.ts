import type { VehicleTaskRepository } from '@car-spa/application';
import type { VehicleTask } from '@car-spa/domain';
import { COLLECTIONS, type TaskStatus } from '@car-spa/shared';
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

function mapVehicleTask(id: string, data: Record<string, unknown>): VehicleTask {
  const status = String(data.status);
  return {
    id,
    orgId: String(data.orgId),
    customerId: String(data.customerId),
    vehicleId: String(data.vehicleId),
    serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds.map(String) : [],
    status: (['RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'].includes(
      status,
    )
      ? status
      : 'RECEIVED') as TaskStatus,
    paymentMode: (data.paymentMode as VehicleTask['paymentMode']) || 'CASH',
    paymentStatus: (data.paymentStatus as VehicleTask['paymentStatus']) || 'PENDING',
    totalAmount: Number(data.totalAmount) || 0,
    paidAmount: Number(data.paidAmount) || 0,
    dueAmount: Number(data.dueAmount) || 0,
    notes: data.notes ? String(data.notes) : null,
    assignedTo: data.assignedTo ? String(data.assignedTo) : null,
    receiptUrl: data.receiptUrl ? String(data.receiptUrl) : null,
    createdBy: String(data.createdBy),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreVehicleTaskRepository implements VehicleTaskRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.vehicleTasks, id));
    if (!snapshot.exists()) return null;
    return mapVehicleTask(snapshot.id, snapshot.data());
  }

  async findByOrgId(
    orgId: string,
    options?: { status?: TaskStatus; limit?: number; offset?: string },
  ) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.vehicleTasks),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.status) q = query(q, where('status', '==', options.status));
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapVehicleTask(d.id, d.data()));
  }

  async create(data: Omit<VehicleTask, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.vehicleTasks), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapVehicleTask(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<VehicleTask>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.vehicleTasks, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapVehicleTask(saved.id, saved.data()!);
  }

  async getCountByStatus(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.vehicleTasks),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    const counts: Record<string, number> = {
      RECEIVED: 0,
      IN_PROGRESS: 0,
      READY_FOR_PICKUP: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    snapshot.docs.forEach((d) => {
      const data = d.data();
      const status = String(data?.status ?? '') as TaskStatus;
      if (status in counts) counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts as Record<TaskStatus, number>;
  }
}
