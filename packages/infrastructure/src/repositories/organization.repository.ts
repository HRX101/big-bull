import type { OrganizationRepository } from '@car-spa/application';
import type { Organization } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapOrganization(id: string, data: Record<string, unknown>): Organization {
  return {
    id,
    name: String(data.name),
    slug: String(data.slug),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreOrganizationRepository implements OrganizationRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.organizations, id));
    if (!snapshot.exists()) return null;
    return mapOrganization(snapshot.id, snapshot.data());
  }

  async findBySlug(slug: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.organizations),
      where('slug', '==', slug),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapOrganization(first.id, first.data());
  }

  async create(data: { name: string; slug: string }) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.organizations), {
      name: data.name,
      slug: data.slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const created = await getDoc(ref);
    return mapOrganization(created.id, created.data()!);
  }
}
