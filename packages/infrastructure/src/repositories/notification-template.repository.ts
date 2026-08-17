import type { NotificationTemplateRepository } from '@car-spa/application';
import type { StatusChangeNotificationTemplate } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapTemplate(id: string, data: Record<string, unknown>): StatusChangeNotificationTemplate {
  return {
    storeId: data.storeId ? String(data.storeId) : id,
    messageTemplate: String(data.messageTemplate),
    placeholders: Array.isArray(data.placeholders)
      ? (data.placeholders as StatusChangeNotificationTemplate['placeholders'])
      : [],
    updatedAt: fromFirestoreDate(data.updatedAt),
    updatedBy: String(data.updatedBy),
  };
}

export class FirestoreNotificationTemplateRepository implements NotificationTemplateRepository {
  async findByOrgId(orgId: string) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.notificationTemplates, orgId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return mapTemplate(snap.id, snap.data());
  }

  async upsert(data: Omit<StatusChangeNotificationTemplate, 'updatedAt'> & { updatedAt?: Date }) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.notificationTemplates, data.storeId);
    await setDoc(
      ref,
      { ...data, orgId: data.storeId, updatedAt: data.updatedAt ?? serverTimestamp() },
      { merge: true },
    );
    const saved = await getDoc(ref);
    return mapTemplate(saved.id, saved.data()!);
  }
}
