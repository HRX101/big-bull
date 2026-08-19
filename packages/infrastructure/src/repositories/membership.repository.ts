import type { MembershipRepository } from '@car-spa/application';
import type { Membership } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  deleteDoc,
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
import { fromFirestoreDate, parseRole } from '../firebase/mappers';

function mapMembership(id: string, data: Record<string, unknown>): Membership {
  return {
    id,
    userId: String(data.userId),
    orgId: String(data.orgId),
    role: parseRole(data.role) ?? 'employee',
    active: data.active !== false,
    salaryAmount: data.salaryAmount != null ? Number(data.salaryAmount) : null,
    minWorkDays: data.minWorkDays != null ? Number(data.minWorkDays) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreMembershipRepository implements MembershipRepository {
  async findByUserId(userId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.memberships),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapMembership(first.id, first.data());
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.memberships),
      where('orgId', '==', orgId),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapMembership(d.id, d.data()));
  }

  async create(data: {
    userId: string;
    orgId: string;
    role: Membership['role'];
    salaryAmount?: number | null;
    minWorkDays?: number | null;
  }) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.memberships), {
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      active: true,
      salaryAmount: data.salaryAmount ?? null,
      minWorkDays: data.minWorkDays ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: ref.id,
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      active: true,
      salaryAmount: data.salaryAmount ?? null,
      minWorkDays: data.minWorkDays ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(
    id: string,
    data: {
      role?: Membership['role'];
      active?: boolean;
      salaryAmount?: number | null;
      minWorkDays?: number | null;
    },
  ) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.memberships, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapMembership(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.memberships, id));
  }
}
