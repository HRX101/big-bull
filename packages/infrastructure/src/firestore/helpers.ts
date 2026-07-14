import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@car-spa/shared';
import { getFirebaseDb } from '../firebase/client';
import { fromFirestoreDate } from '../firebase/mappers';

export async function addOrgDoc<T extends Record<string, unknown>>(
  collectionName: string,
  orgId: string,
  data: T,
) {
  const ref = await addDoc(collection(getFirebaseDb(), collectionName), {
    ...data,
    orgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: ref.id, data: snap.data()! };
}

export async function updateOrgDoc(
  collectionName: string,
  orgId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const ref = doc(getFirebaseDb(), collectionName, id);
  const existing = await getDoc(ref);
  if (!existing.exists() || existing.data()?.orgId !== orgId) {
    throw new Error('Not found');
  }
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  const updated = await getDoc(ref);
  return updated.data()!;
}

export async function deleteOrgDoc(collectionName: string, orgId: string, id: string) {
  const ref = doc(getFirebaseDb(), collectionName, id);
  const existing = await getDoc(ref);
  if (!existing.exists() || existing.data()?.orgId !== orgId) {
    throw new Error('Not found');
  }
  await deleteDoc(ref);
}

export async function getOrgDoc(collectionName: string, orgId: string, id: string) {
  const snap = await getDoc(doc(getFirebaseDb(), collectionName, id));
  if (!snap.exists() || snap.data()?.orgId !== orgId) return null;
  return { id: snap.id, data: snap.data() };
}

export async function listOrgDocs(collectionName: string, orgId: string, orderField = 'createdAt') {
  const q = query(
    collection(getFirebaseDb(), collectionName),
    where('orgId', '==', orgId),
    orderBy(orderField, 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export { fromFirestoreDate, COLLECTIONS };
