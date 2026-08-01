import type { StoreSettingsRepository } from '@car-spa/application';
import type { StoreSettings } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapSettings(id: string, data: Record<string, unknown>): StoreSettings {
  return {
    id,
    orgId: String(data.orgId),
    storeName: String(data.storeName),
    address: data.address ? String(data.address) : null,
    phone: data.phone ? String(data.phone) : null,
    email: data.email ? String(data.email) : null,
    gstin: data.gstin ? String(data.gstin) : null,
    taxRate: Number(data.taxRate) || 0,
    logoUrl: data.logoUrl ? String(data.logoUrl) : null,
    whatsappProvider: (data.whatsappProvider as StoreSettings['whatsappProvider']) || 'NONE',
    whatsappApiKey: data.whatsappApiKey ? String(data.whatsappApiKey) : null,
    whatsappPhoneNumberId: data.whatsappPhoneNumberId ? String(data.whatsappPhoneNumberId) : null,
    whatsappTemplateId: data.whatsappTemplateId ? String(data.whatsappTemplateId) : null,
    workingDaysPerMonth: Number(data.workingDaysPerMonth) || 26,
    defaultLeaveType: (data.defaultLeaveType as StoreSettings['defaultLeaveType']) || 'UNPAID',
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreStoreSettingsRepository implements StoreSettingsRepository {
  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.storeSettings),
      where('orgId', '==', orgId),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapSettings(first.id, first.data());
  }

  async upsert(data: Omit<StoreSettings, 'id' | 'createdAt' | 'updatedAt'>) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.storeSettings),
      where('orgId', '==', data.orgId),
    );
    const snapshot = await getDocs(q);
    const existing = snapshot.docs[0];

    if (existing) {
      const ref = doc(getFirebaseDb(), COLLECTIONS.storeSettings, existing.id);
      await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      const saved = await getDoc(ref);
      return mapSettings(saved.id, saved.data()!);
    }

    const ref = doc(collection(getFirebaseDb(), COLLECTIONS.storeSettings));
    await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapSettings(saved.id, saved.data()!);
  }
}
