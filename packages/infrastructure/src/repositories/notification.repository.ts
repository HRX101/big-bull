import type { NotificationRepository } from '@car-spa/application';
import type { NotificationLog } from '@car-spa/domain';
import { COLLECTIONS } from '@car-spa/shared';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapNotification(id: string, data: Record<string, unknown>): NotificationLog {
  return {
    id,
    orgId: String(data.orgId),
    type: (data.type as NotificationLog['type']) || 'WHATSAPP',
    recipient: String(data.recipient),
    templateId: data.templateId ? String(data.templateId) : null,
    message: String(data.message),
    status: (data.status as NotificationLog['status']) || 'PENDING',
    error: data.error ? String(data.error) : null,
    referenceType: String(data.referenceType),
    referenceId: String(data.referenceId),
    retryCount: Number(data.retryCount) || 0,
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreNotificationRepository implements NotificationRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.notificationLogs, id));
    if (!snapshot.exists()) return null;
    return mapNotification(snapshot.id, snapshot.data());
  }

  async findByReference(referenceType: string, referenceId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.notificationLogs),
      where('referenceType', '==', referenceType),
      where('referenceId', '==', referenceId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapNotification(d.id, d.data()));
  }

  async create(data: Omit<NotificationLog, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.notificationLogs), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapNotification(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<NotificationLog>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.notificationLogs, id);
    await updateDoc(ref, data);
    const saved = await getDoc(ref);
    return mapNotification(saved.id, saved.data()!);
  }

  async getFailedNotifications(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.notificationLogs),
      where('orgId', '==', orgId),
      where('status', '==', 'FAILED'),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapNotification(d.id, d.data()));
  }
}
