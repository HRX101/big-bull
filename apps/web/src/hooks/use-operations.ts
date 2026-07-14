'use client';

import {
  approvePayrollEntryUseCase,
  createCustomerUseCase,
  createEmployeeUseCase,
  createInventoryItemUseCase,
  createMechanicUseCase,
  createPayrollEntryUseCase,
  createPosOrderUseCase,
  createVehicleTaskUseCase,
  createVehicleUseCase,
  deleteCustomerUseCase,
  getWorkshopAnalyticsUseCase,
  listAuditLogsUseCase,
  listCustomersUseCase,
  listEmployeesUseCase,
  listInventoryUseCase,
  listMechanicsUseCase,
  listNotificationsUseCase,
  listPayrollEntriesUseCase,
  listPosOrdersUseCase,
  listVehicleTasksUseCase,
  listVehiclesUseCase,
  markNotificationReadUseCase,
  payPosOrderUseCase,
  transitionVehicleTaskUseCase,
} from '@car-spa/infrastructure';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const keys = {
  customers: ['customers'] as const,
  vehicles: ['vehicles'] as const,
  tasks: ['tasks'] as const,
  inventory: ['inventory'] as const,
  employees: ['employees'] as const,
  mechanics: ['mechanics'] as const,
  pos: ['pos'] as const,
  payroll: ['payroll'] as const,
  audit: ['audit'] as const,
  notifications: ['notifications'] as const,
  analytics: ['analytics'] as const,
};

function useResultQuery<T>(key: readonly string[], fn: () => Promise<{ success: boolean; value?: T; error?: Error }>) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await fn();
      if (!result.success) throw result.error ?? new Error('Request failed');
      return result.value as T;
    },
  });
}

export function useCustomers() {
  return useResultQuery(keys.customers, () => listCustomersUseCase.execute());
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createCustomerUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.customers }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomerUseCase.execute(id),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.customers }),
  });
}

export function useVehicles() {
  return useResultQuery(keys.vehicles, () => listVehiclesUseCase.execute());
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createVehicleUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.vehicles }),
  });
}

export function useVehicleTasks() {
  return useResultQuery(keys.tasks, () => listVehicleTasksUseCase.execute());
}

export function useCreateVehicleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createVehicleTaskUseCase.execute(input),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: keys.tasks });
        qc.invalidateQueries({ queryKey: keys.notifications });
      }
    },
  });
}

export function useTransitionVehicleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => transitionVehicleTaskUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.tasks }),
  });
}

export function useInventory() {
  return useResultQuery(keys.inventory, () => listInventoryUseCase.execute());
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createInventoryItemUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.inventory }),
  });
}

export function useEmployees() {
  return useResultQuery(keys.employees, () => listEmployeesUseCase.execute());
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createEmployeeUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.employees }),
  });
}

export function useMechanics() {
  return useResultQuery(keys.mechanics, () => listMechanicsUseCase.execute());
}

export function useCreateMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createMechanicUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.mechanics }),
  });
}

export function usePosOrders() {
  return useResultQuery(keys.pos, () => listPosOrdersUseCase.execute());
}

export function useCreatePosOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createPosOrderUseCase.execute(input),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: keys.pos });
        qc.invalidateQueries({ queryKey: keys.analytics });
      }
    },
  });
}

export function usePayPosOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, paymentMethod }: { orderId: string; paymentMethod: 'cash' | 'card' | 'upi' | 'other' }) =>
      payPosOrderUseCase.execute(orderId, paymentMethod),
    onSuccess: (r) => {
      if (r.success) {
        qc.invalidateQueries({ queryKey: keys.pos });
        qc.invalidateQueries({ queryKey: keys.analytics });
      }
    },
  });
}

export function usePayrollEntries() {
  return useResultQuery(keys.payroll, () => listPayrollEntriesUseCase.execute());
}

export function useCreatePayrollEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) => createPayrollEntryUseCase.execute(input),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.payroll }),
  });
}

export function useApprovePayrollEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvePayrollEntryUseCase.execute(id),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.payroll }),
  });
}

export function useAuditLogs() {
  return useResultQuery(keys.audit, () => listAuditLogsUseCase.execute());
}

export function useNotifications() {
  return useResultQuery(keys.notifications, () => listNotificationsUseCase.execute());
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationReadUseCase.execute(id),
    onSuccess: (r) => r.success && qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

export function useAnalytics() {
  return useResultQuery(keys.analytics, () => getWorkshopAnalyticsUseCase.execute());
}
