import type { DraftRepository } from '@car-spa/application';
import type { TaskDraft } from '@car-spa/domain';
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
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

function mapDraft(id: string, data: Record<string, unknown>): TaskDraft {
  return {
    id,
    orgId: String(data.orgId),
    userId: String(data.userId),
    step: Number(data.step) || 1,
    data: (data.data as Record<string, unknown>) || {},
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreDraftRepository implements DraftRepository {
  async findByUserAndType(userId: string, type: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.drafts),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs[0];
    if (!first) return null;
    return mapDraft(first.id, first.data());
  }

  async upsert(data: Omit<TaskDraft, 'id'>) {
    const existing = await this.findByUserAndType(data.userId, 'vehicle-task');
    if (existing) {
      const ref = doc(getFirebaseDb(), COLLECTIONS.drafts, existing.id);
      await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      const saved = await getDoc(ref);
      return mapDraft(saved.id, saved.data()!);
    }
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.drafts), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapDraft(saved.id, saved.data()!);
  }

  async delete(id: string) {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.drafts, id));
  }
}
