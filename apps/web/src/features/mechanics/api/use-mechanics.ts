'use client';

import {
  mechanicRepository,
  mechanicLedgerRepository,
  createMechanicUseCase,
  addMechanicLedgerEntryUseCase,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useMechanics(orgId: string) {
  return useQuery({
    queryKey: ['mechanics', orgId],
    queryFn: () => mechanicRepository.findByOrgId(orgId),
    enabled: !!orgId,
  });
}

export function useCreateMechanic() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return createMechanicUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    },
  });
}

export function useUpdateMechanic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      mechanicRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    },
  });
}

export function useDeleteMechanic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mechanicRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    },
  });
}

export function useMechanicLedger(mechanicId: string) {
  return useQuery({
    queryKey: ['mechanic-ledger', mechanicId],
    queryFn: () => mechanicLedgerRepository.findByMechanicId(mechanicId, { limit: 200 }),
    enabled: !!mechanicId,
  });
}

export function useAddLedgerEntry() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return addMechanicLedgerEntryUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanic-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    },
  });
}
