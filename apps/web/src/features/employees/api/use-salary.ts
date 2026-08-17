'use client';

import {
  salaryRecordRepository,
  userRepository,
  leaveRequestRepository,
  createSalaryRecordUseCase,
  approveSalaryRecordUseCase,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useSalaryRecords(orgId: string) {
  return useQuery({
    queryKey: ['salary-records', orgId],
    queryFn: () => salaryRecordRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useMySalaryRecords(employeeId: string) {
  return useQuery({
    queryKey: ['salary-records', 'my', employeeId],
    queryFn: () => salaryRecordRepository.findByEmployeeId(employeeId, { limit: 100 }),
    enabled: !!employeeId,
  });
}

export function useEmployeeUsers(orgId: string) {
  return useQuery({
    queryKey: ['employee-users', orgId],
    queryFn: () => userRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useEmployeeLeaveDays(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['employee-leave-days', employeeId, month, year],
    queryFn: async () => {
      const leaves = await leaveRequestRepository.findByEmployeeId(employeeId, { limit: 100 });
      const approved = leaves.filter((l) => l.status === 'APPROVED');
      let total = 0;
      for (const leave of approved) {
        const from = new Date(leave.fromDate);
        const to = new Date(leave.toDate);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        const overlapStart = from > start ? from : start;
        const overlapEnd = to < end ? to : end;
        if (overlapStart <= overlapEnd) {
          total +=
            Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
      }
      return total;
    },
    enabled: !!employeeId && month >= 1 && month <= 12 && year >= 2020,
  });
}

export function useCreateSalary() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      const result = await createSalaryRecordUseCase.execute(input, session.orgId, session.userId);
      if (!result.success) throw new Error(result.error?.message ?? 'Failed');
      return result.value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
    },
  });
}

export function useApproveSalary() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: async ({ salaryId, status }: { salaryId: string; status: 'APPROVED' | 'PAID' }) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      const result = await approveSalaryRecordUseCase.execute(
        salaryId,
        status,
        session.orgId,
        session.userId,
      );
      if (!result.success) throw new Error(result.error?.message ?? 'Failed');
      return result.value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
    },
  });
}
