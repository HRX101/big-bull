import type { ProductRepository } from '@car-spa/application';
import type { Product } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
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

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = getFirebaseDb();
    const results: Product[] = [];
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const q = query(collection(db, COLLECTIONS.products), where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      results.push(...snapshot.docs.map((d) => mapProduct(d.id, d.data())));
    }
    return results;
  }

  async findByCategoryId(categoryId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.products),
      where('categoryId', '==', categoryId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
  }

  async findByOrgId(orgId: string, options?: { limit?: number }) {
    let q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('orgId', '==', orgId));
    if (options?.limit) q = query(q, firestoreLimit(options.limit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
  }

  async findBySku(sku: string) {
    const q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('sku', '==', sku));
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapProduct(first.id, first.data());
  }

  async search(orgId: string, queryStr: string) {
    const q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    const lower = queryStr.toLowerCase();
    const products = snapshot.docs.map((d) => mapProduct(d.id, d.data()));

    const categoriesSnap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.categories), where('orgId', '==', orgId)),
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
    return {
      id: ref.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product;
  }

  async createWithSequence(input: {
    orgId: string;
    codePrefix: string;
    actorId?: string;
    data: Omit<Product, 'id' | 'orgId' | 'sku' | 'createdAt' | 'updatedAt'>;
  }) {
    const db = getFirebaseDb();
    const seqRef = doc(collection(db, COLLECTIONS.sequences), `${input.orgId}_${input.codePrefix}`);
    const productRef = doc(collection(db, COLLECTIONS.products));
    const seedMarker = 'SEQUENCE_NEEDS_SEED';
    const initialStock = Number(input.data.currentStock) || 0;
    const movementRef = doc(collection(db, COLLECTIONS.stockMovements));
    try {
      return await runTransaction(db, async (tx) => {
        const snap = await tx.get(seqRef);
        if (!snap.exists()) throw new Error(seedMarker);
        const count = Number(snap.data().count) || 0;
        const sku = `${input.codePrefix}-${String(count + 1).padStart(4, '0')}`;
        tx.update(seqRef, { count: count + 1 });
        tx.set(productRef, {
          ...input.data,
          orgId: input.orgId,
          sku,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (initialStock > 0) {
          tx.set(movementRef, {
            orgId: input.orgId,
            productId: productRef.id,
            type: 'RESTOCK_IN',
            quantity: initialStock,
            note: 'Initial stock',
            referenceId: null,
            supplierId: input.data.supplierId || null,
            actorId: input.actorId || null,
            serialNumbers: null,
            createdAt: serverTimestamp(),
          });
        }
        return {
          id: productRef.id,
          ...input.data,
          orgId: input.orgId,
          sku,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Product;
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== seedMarker) throw error;
      const count = await this.countWithPrefix(input.orgId, input.codePrefix);
      const sku = `${input.codePrefix}-${String(count + 1).padStart(4, '0')}`;
      const batch = writeBatch(db);
      batch.set(seqRef, { orgId: input.orgId, prefix: input.codePrefix, count: count + 1 });
      batch.set(productRef, {
        ...input.data,
        orgId: input.orgId,
        sku,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (initialStock > 0) {
        batch.set(movementRef, {
          orgId: input.orgId,
          productId: productRef.id,
          type: 'RESTOCK_IN',
          quantity: initialStock,
          note: 'Initial stock',
          referenceId: null,
          supplierId: input.data.supplierId || null,
          actorId: input.actorId || null,
          serialNumbers: null,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      return {
        id: productRef.id,
        ...input.data,
        orgId: input.orgId,
        sku,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product;
    }
  }

  private async countWithPrefix(orgId: string, prefix: string) {
    const q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.filter((d) => String(d.data().sku || '').startsWith(`${prefix}-`)).length;
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

  async deleteMany(ids: string[]) {
    if (ids.length === 0) return;
    const db = getFirebaseDb();
    for (let i = 0; i < ids.length; i += 500) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + 500)) {
        batch.delete(doc(db, COLLECTIONS.products, id));
      }
      await batch.commit();
    }
  }

  async updateCurrentStock(id: string, quantity: number) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.products, id);
    await updateDoc(ref, { currentStock: quantity, updatedAt: serverTimestamp() });
  }

  async getLowStock(orgId: string, threshold: number) {
    const q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => mapProduct(d.id, d.data()))
      .filter((p) => p.currentStock < threshold);
  }

  async getStockValue(orgId: string) {
    const q = query(collection(getFirebaseDb(), COLLECTIONS.products), where('orgId', '==', orgId));
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
    if (data.length === 0) return [];
    const db = getFirebaseDb();
    const results: Product[] = [];
    for (let i = 0; i < data.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = data.slice(i, i + 500);
      for (const item of chunk) {
        const ref = doc(collection(db, COLLECTIONS.products));
        batch.set(ref, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        results.push({ id: ref.id, ...item, createdAt: new Date(), updatedAt: new Date() });
      }
      await batch.commit();
    }
    return results;
  }
}
