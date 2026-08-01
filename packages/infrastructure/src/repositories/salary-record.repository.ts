import type { SalaryRecordRepository } from '@car-spa/application';
import type { SalaryRecord } from '@car-spa/domain';
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

function mapSalary(id: string, data: Record<string, unknown>): SalaryRecord {
  return {
    id,
    orgId: String(data.orgId),
    employeeId: String(data.employeeId),
    month: Number(data.month) || 1,
    year: Number(data.year) || 2024,
    fullSalary: Number(data.fullSalary) || 0,
    workingDays: Number(data.workingDays) || 26,
    leaveDays: Number(data.leaveDays) || 0,
    perDayRate: Number(data.perDayRate) || 0,
    deduction: Number(data.deduction) || 0,
    payableAmount: Number(data.payableAmount) || 0,
    status: (data.status as SalaryRecord['status']) || 'PENDING',
    receiptUrl: data.receiptUrl ? String(data.receiptUrl) : null,
    notes: data.notes ? String(data.notes) : null,
    createdBy: String(data.createdBy),
    approvedBy: data.approvedBy ? String(data.approvedBy) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

export class FirestoreSalaryRecordRepository implements SalaryRecordRepository {
  async findById(id: string) {
    const snapshot = await getDoc(doc(getFirebaseDb(), COLLECTIONS.salaryRecords, id));
    if (!snapshot.exists()) return null;
    return mapSalary(snapshot.id, snapshot.data());
  }

  async findByOrgId(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.salaryRecords),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapSalary(d.id, d.data()));
  }

  async findByEmployeeId(employeeId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.salaryRecords),
      where('employeeId', '==', employeeId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapSalary(d.id, d.data()));
  }

  async create(data: Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.salaryRecords), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return mapSalary(saved.id, saved.data()!);
  }

  async update(id: string, data: Partial<SalaryRecord>) {
    const ref = doc(getFirebaseDb(), COLLECTIONS.salaryRecords, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    const saved = await getDoc(ref);
    return mapSalary(saved.id, saved.data()!);
  }

  async getPendingCount(orgId: string) {
    const q = query(
      collection(getFirebaseDb(), COLLECTIONS.salaryRecords),
      where('orgId', '==', orgId),
      where('status', '==', 'PENDING'),
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}
