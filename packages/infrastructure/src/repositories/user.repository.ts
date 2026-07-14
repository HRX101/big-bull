import type { UserRepository } from '@car-spa/application';
import type { UserProfile } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate, parseRole } from '../firebase/mappers';

function mapUser(id: string, data: Record<string, unknown>): UserProfile {
  return {
    id,
    email: String(data.email),
    displayName: String(data.displayName),
    photoUrl: data.photoUrl ? String(data.photoUrl) : null,
    emailVerified: Boolean(data.emailVerified),
    orgId: data.orgId ? String(data.orgId) : null,
    role: parseRole(data.role),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreUserRepository implements UserRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, id));
    if (!snapshot.exists()) return null;
    return mapUser(snapshot.id, snapshot.data());
  }

  async upsert(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.users, profile.id);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        email: profile.email,
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
        emailVerified: profile.emailVerified,
        orgId: profile.orgId,
        role: profile.role,
        createdAt: existing.exists() ? existing.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    const saved = await getDoc(ref);
    return mapUser(saved.id, saved.data()!);
  }
}
