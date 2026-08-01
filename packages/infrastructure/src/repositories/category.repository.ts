import type { CategoryRepository } from '@car-spa/application';
import type { Category } from '@car-spa/domain';
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
import { fromFirestoreDate } from '../firebase/mappers';

function mapCategory(id: string, data: Record<string, unknown>): Category {
  const c: Category & { isActive?: boolean } = {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    codePrefix: String(data.codePrefix),
    attributeSchema: (data.attributeSchema as Category['attributeSchema']) || [],
    productNames: Array.isArray(data.productNames)
      ? (data.productNames as string[]).map((n) => String(n))
      : [],
    lowStockThresholdDefault: Number(data.lowStockThresholdDefault) || 0,
    hasExpiry: Boolean(data.hasExpiry),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
  if (data.isActive !== undefined) c.isActive = Boolean(data.isActive);
  else c.isActive = true;
  return c as Category;
}

export class FirestoreCategoryRepository implements CategoryRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.categories, id));
    if (!snapshot.exists()) return null;
    return mapCategory(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(
      collection(getFirebaseDb(), COLLECTIONS.categories),
      where('orgId', '==', orgId),
    );
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapCategory(d.id, d.data()));
  }

  async findByCodePrefix(orgId: string, prefix: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.categories),
      where('orgId', '==', orgId),
      where('codePrefix', '==', prefix),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapCategory(first.id, first.data());
  }

  async getNextSequence(orgId: string, prefix: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    const matching = snapshot.docs.filter((d) => {
      const sku = String(d.data().sku || '');
      return sku.startsWith(`${prefix}-`);
    });
    return matching.length + 1;
  }

  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.categories), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapCategory(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Category>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.categories, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapCategory(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.categories, id));
  }
}
