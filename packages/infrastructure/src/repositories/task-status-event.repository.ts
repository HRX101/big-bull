import type { TaskStatusEventRepository } from '@car-spa/application';
import type { TaskStatusEvent } from '@car-spa/domain';
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

function mapEvent(id: string, data: Record<string, unknown>): TaskStatusEvent {
  return {
    id,
    orgId: String(data.orgId),
    taskId: String(data.taskId),
    fromStatus: data.fromStatus ? (data.fromStatus as TaskStatusEvent['fromStatus']) : null,
    toStatus: data.toStatus as TaskStatusEvent['toStatus'],
    note: String(data.note),
    actorId: String(data.actorId),
    whatsappStatus: (data.whatsappStatus as TaskStatusEvent['whatsappStatus']) || 'NOT_APPLICABLE',
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreTaskStatusEventRepository implements TaskStatusEventRepository {
  async findByTaskId(taskId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.taskStatusEvents),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEvent(d.id, d.data()));
  }

  async create(data: Omit<TaskStatusEvent, 'id' | 'createdAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.taskStatusEvents), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const snapshot = await getDoc(ref);
    const data_ = snapshot.data();
    if (!data_) throw new Error('Failed to load created event');
    return mapEvent(snapshot.id, data_);
  }

  async updateWhatsAppStatus(id: string, status: TaskStatusEvent['whatsappStatus']) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.taskStatusEvents, id);
    await updateDoc(ref, { whatsappStatus: status });
  }
}
