import type { MembershipRepository } from '@car-spa/application';
import type { Membership } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate, parseRole } from '../firebase/mappers';

function mapMembership(id: string, data: Record<string, unknown>): Membership {
  return {
    id,
    userId: String(data.userId),
    orgId: String(data.orgId),
    role: parseRole(data.role) ?? 'employee',
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

  async create(data: { userId: string; orgId: string; role: Membership['role'] }) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.memberships), {
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: ref.id,
      userId: data.userId,
      orgId: data.orgId,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
