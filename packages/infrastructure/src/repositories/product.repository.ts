import type { ProductRepository } from '@car-spa/application';
import type { Product } from '@car-spa/domain';
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

function mapProduct(id: string, data: Record<string, unknown>): Product {
  const p: Product & { isActive?: boolean; archivedAt?: unknown; archivedBy?: string } = {
    id,
    orgId: String(data.orgId),
    categoryId: String(data.categoryId),
    sku: String(data.sku),
    name: String(data.name),
    attributeValues: (data.attributeValues as Record<string, unknown>) || {},
    costPrice: Number(data.costPrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    unit: String(data.unit),
    lowStockThreshold: Number(data.lowStockThreshold) || 0,
    currentStock: Number(data.currentStock) || 0,
    expiryDate: data.expiryDate ? fromFirestoreDate(data.expiryDate) : null,
    imageUrl: data.imageUrl ? String(data.imageUrl) : null,
    supplierId: data.supplierId ? String(data.supplierId) : null,
    notes: data.notes ? String(data.notes) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
  if (data.isActive !== undefined) p.isActive = Boolean(data.isActive);
  else p.isActive = true;
  if (data.archivedAt) p.archivedAt = data.archivedAt;
  if (data.archivedBy) p.archivedBy = String(data.archivedBy);
  return p as Product;
}

export class FirestoreProductRepository implements ProductRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.products, id));
    if (!snapshot.exists()) return null;
    return mapProduct(snapshot.id, snapshot.data());
  }

  async findByCategoryId(categoryId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('categoryId', '==', categoryId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
  }

  async findBySku(sku: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('sku', '==', sku),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapProduct(first.id, first.data());
  }

  async search(orgId: string, queryStr: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    const lower = queryStr.toLowerCase();
    const products = snapshot.docs.map((d) => mapProduct(d.id, d.data()));

    const categoriesSnap = await getDocs(
      query(
        collection(getFirebaseDb(), COLLECTIONS.categories),
        where('orgId', '==', orgId),
      ),
    );
    const categoryMap = new Map<string, string>();
    categoriesSnap.docs.forEach((d) => {
      categoryMap.set(d.id, String(d.data().name || ''));
    });

    return products.filter((p) => {
      if (p.name.toLowerCase().includes(lower)) return true;
      if (p.sku.toLowerCase().includes(lower)) return true;
      const catName = categoryMap.get(p.categoryId) || '';
      if (catName.toLowerCase().includes(lower)) return true;
      return false;
    });
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.products), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapProduct(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<Product>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.products, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapProduct(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.products, id));
  }

  async updateCurrentStock(id: string, quantity: number) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.products, id);
    await updateDoc(ref, { currentStock: quantity, updatedAt: serverTimestamp() });
  }

  async getLowStock(orgId: string, threshold: number) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => mapProduct(d.id, d.data()))
      .filter((p) => p.currentStock < threshold);
  }

  async getStockValue(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((d) => mapProduct(d.id, d.data()));
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const p of products) {
      const value = p.currentStock * p.costPrice;
      total += value;
      byCategory[p.categoryId] = (byCategory[p.categoryId] || 0) + value;
    }
    return { total, byCategory };
  }

  async getTopSelling() {
    return [];
  }

  async getSlowMoving() {
    return [];
  }

  async bulkCreate(data: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
    const results: Product[] = [];
    for (const item of data) {
      const product = await this.create(item);
      results.push(product);
    }
    return results;
  }
}
