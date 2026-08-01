'use client';

import {
  createVehicleTaskUseCase,
  changeTaskStatusUseCase,
  recordTaskPaymentUseCase,
  vehicleTaskRepository,
  taskStatusEventRepository,
  draftRepository,
  customerRepository,
  serviceRepository,
  vehicleRepository,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskStatus } from '@car-spa/shared';

export function useVehicleTasks(orgId: string, status?: TaskStatus) {
  return useQuery({
    queryKey: ['vehicle-tasks', orgId, status],
    queryFn: () => vehicleTaskRepository.findByOrgId(orgId, status ? { status } : undefined),
    enabled: !!orgId,
  });
}

export function useCreateVehicleTask() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return createVehicleTaskUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-tasks'] });
    },
  });
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return changeTaskStatusUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-events'] });
    },
  });
}

export function useRecordTaskPayment() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return recordTaskPaymentUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-tasks'] });
    },
  });
}

export function useTaskEvents(taskId: string | null) {
  return useQuery({
    queryKey: ['task-events', taskId],
    queryFn: () => taskStatusEventRepository.findByTaskId(taskId!),
    enabled: !!taskId,
  });
}

export function useSaveDraft() {
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return draftRepository.upsert({
        orgId: session.orgId,
        userId: session.userId,
        step: (data.step as number) ?? 1,
        data,
        updatedAt: new Date(),
      });
    },
  });
}

export function useGetDraft() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.userId ?? '';

  return useQuery({
    queryKey: ['draft', 'vehicle-task', userId],
    queryFn: () => draftRepository.findByUserAndType(userId, 'vehicle-task'),
    enabled: !!userId,
  });
}

export function useCustomers(orgId: string) {
  return useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => customerRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useServices(orgId: string) {
  return useQuery({
    queryKey: ['services', orgId],
    queryFn: () => serviceRepository.findByOrgId(orgId),
    enabled: !!orgId,
  });
}

export function useVehicles(customerId: string | null) {
  return useQuery({
    queryKey: ['vehicles', customerId],
    queryFn: () => vehicleRepository.findByCustomerId(customerId!, { limit: 100 }),
    enabled: !!customerId,
  });
}

export function useVehiclesByOrg(orgId: string) {
  return useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: () => vehicleRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useVehicle(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehicleRepository.findById(vehicleId!),
    enabled: !!vehicleId,
  });
}
