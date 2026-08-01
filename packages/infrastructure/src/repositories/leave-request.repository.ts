import type { LeaveRequestRepository } from '@car-spa/application';
import type { LeaveRequest } from '@car-spa/domain';
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

function mapLeave(id: string, data: Record<string, unknown>): LeaveRequest {
  return {
    id,
    orgId: String(data.orgId),
    employeeId: String(data.employeeId),
    fromDate: fromFirestoreDate(data.fromDate),
    toDate: fromFirestoreDate(data.toDate),
    reason: data.reason ? String(data.reason) : null,
    status: (data.status as LeaveRequest['status']) || 'PENDING',
    leaveType: (data.leaveType as LeaveRequest['leaveType']) || 'UNPAID',
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : null,
    reviewedAt: data.reviewedAt ? fromFirestoreDate(data.reviewedAt) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreLeaveRequestRepository implements LeaveRequestRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.leaveRequests, id));
    if (!snapshot.exists()) return null;
    return mapLeave(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.leaveRequests),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapLeave(d.id, d.data()));
  }

  async findByEmployeeId(employeeId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.leaveRequests),
      where('employeeId', '==', employeeId),
      orderBy('createdAt', 'desc'),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapLeave(d.id, d.data()));
  }

  async create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.leaveRequests), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapLeave(saved.id, saved.data()!);
  }

  async update(id: string, data: { status: LeaveRequest['status']; reviewedBy: string; reviewedAt: Date }) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.leaveRequests, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapLeave(saved.id, saved.data()!);
  }

  async getPendingCount(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.leaveRequests),
      where('orgId', '==', orgId),
      where('status', '==', 'PENDING'),
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}
