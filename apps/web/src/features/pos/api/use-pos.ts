'use client';

import {
  productRepository,
  customerRepository,
  posSaleRepository,
  createPOSSaleUseCase,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useInventoryItems(orgId: string) {
  return useQuery({
    queryKey: ['products', orgId],
    queryFn: () => productRepository.findByOrgId(orgId, { limit: 500 }),
    enabled: !!orgId,
  });
}

export function useCustomers(orgId: string) {
  return useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => customerRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useSales(orgId: string) {
  return useQuery({
    queryKey: ['posSales', orgId],
    queryFn: () => posSaleRepository.findByOrgId(orgId, { limit: 20 }),
    enabled: !!orgId,
  });
}

export function useAllSales(orgId: string) {
  return useQuery({
    queryKey: ['posSales', orgId, 'all'],
    queryFn: () => posSaleRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return createPOSSaleUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posSales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTotal'] });
    },
  });
}

export function useDailyTotal(orgId: string) {
  return useQuery({
    queryKey: ['dailyTotal', orgId],
    queryFn: () => posSaleRepository.getDailyTotal(orgId),
    enabled: !!orgId,
  });
}
