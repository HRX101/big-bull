'use client';

import {
  createCustomerUseCase,
  customerRepository,
  searchCustomersUseCase,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function useCustomers(orgId: string) {
  return useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => customerRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
}

export function useCustomerSearch(orgId: string, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['customers', 'search', orgId, debouncedQuery],
    queryFn: () => searchCustomersUseCase.execute(orgId, debouncedQuery),
    enabled: !!orgId,
  });
}

export function useCustomerByPhone(orgId: string, phone: string) {
  const [debouncedPhone, setDebouncedPhone] = useState(phone);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhone(phone.trim()), 400);
    return () => clearTimeout(timer);
  }, [phone]);

  return useQuery({
    queryKey: ['customers', orgId, 'phone', debouncedPhone],
    queryFn: () => customerRepository.findByPhone(orgId, debouncedPhone),
    enabled: !!orgId && debouncedPhone.length >= 10,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  return useMutation({
    mutationFn: (input: unknown) => {
      if (!session?.orgId || !session?.userId) throw new Error('No session');
      return createCustomerUseCase.execute(input, session.orgId, session.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
