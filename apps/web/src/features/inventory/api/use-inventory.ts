'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  categoryRepository,
  productRepository,
  stockMovementRepository,
  supplierRepository,
  serializedItemRepository,
  createCategoryUseCase,
  createProductUseCase,
  recordStockMovementUseCase,
  createSupplierUseCase,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Product, Supplier, SerializedItem } from '@car-spa/domain';
import { hasPermission } from '@car-spa/shared';

function useSession() {
  const session = useAuthStore((s) => s.session);
  return { orgId: session?.orgId ?? '', userId: session?.userId ?? '', role: session?.role ?? 'employee' };
}

function can(role: 'owner' | 'employee', permission: Parameters<typeof hasPermission>[1]) {
  return hasPermission(role, permission);
}

/* ────── Categories ────── */

export function useCategories(orgId: string) {
  return useQuery({
    queryKey: ['categories', orgId],
    queryFn: () => categoryRepository.findByOrgId(orgId),
    enabled: !!orgId,
    select: useCallback((data: Category[]) => data.filter((c) => (c as unknown as Record<string, unknown>).isActive !== false), []),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { orgId, userId, role } = useSession();
  return useMutation({
    mutationFn: (input: unknown) => {
      if (!can(role, 'inventory:create')) throw new Error('Permission denied');
      if (!orgId || !userId) throw new Error('No session');
      return createCategoryUseCase.execute(input, orgId, userId);
    },
    onSuccess: (result) => {
      if (result.success) { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['categories'] }); }
      else toast.error(result.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (!can(role, 'inventory:update')) throw new Error('Permission denied');
      return categoryRepository.update(id, data);
    },
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchiveCategory() {
  const qc = useQueryClient();
  const { userId, role } = useSession();
  return useMutation({
    mutationFn: (id: string) => {
      if (!can(role, 'inventory:delete')) throw new Error('Permission denied');
      return categoryRepository.update(id, { isActive: false, archivedAt: new Date(), archivedBy: userId } as unknown as Partial<Category>);
    },
    onSuccess: () => { toast.success('Category archived'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useHardDeleteCategory() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!can(role, 'inventory:delete')) throw new Error('Permission denied');
      const products = await productRepository.findByCategoryId(id);
      for (const p of products) {
        const serials = await serializedItemRepository.findByProductId(p.id);
        for (const s of serials) await serializedItemRepository.delete(s.id);
        await productRepository.delete(p.id);
      }
      await categoryRepository.delete(id);
    },
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['serializedItems'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchivedCategories(orgId: string) {
  return useQuery({
    queryKey: ['categories', orgId, 'archived'],
    queryFn: async () => {
      const all = await categoryRepository.findByOrgId(orgId);
      return all.filter((c) => (c as unknown as Record<string, unknown>).isActive === false);
    },
    enabled: !!orgId,
  });
}

/* ────── Products ────── */

export function useProducts(orgId: string) {
  return useQuery({
    queryKey: ['products', orgId],
    queryFn: () => productRepository.findByOrgId(orgId),
    enabled: !!orgId,
    select: useCallback((data: Product[]) => data.filter((p) => (p as unknown as Record<string, unknown>).isActive !== false), []),
  });
}

export function useProductsByCategory(categoryId: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => productRepository.findByCategoryId(categoryId),
    enabled: !!categoryId,
    select: useCallback((data: Product[]) => data.filter((p) => (p as unknown as Record<string, unknown>).isActive !== false), []),
  });
}

export function useProductSearch(orgId: string) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebounced] = useState('');
  const timerRef = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);

  const setSearch = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(q.trim()), 300);
  }, [timerRef]);

  const results = useQuery({
    queryKey: ['products', 'search', orgId, debouncedQuery],
    queryFn: () => debouncedQuery ? productRepository.search(orgId, debouncedQuery) : productRepository.findByOrgId(orgId),
    enabled: !!orgId,
    select: useCallback((data: Product[]) => data.filter((p) => (p as unknown as Record<string, unknown>).isActive !== false), []),
  });

  return { query, setSearch, results, isSearching: !!debouncedQuery };
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { orgId, userId, role } = useSession();
  return useMutation({
    mutationFn: (input: unknown) => {
      if (!can(role, 'inventory:create')) throw new Error('Permission denied');
      if (!orgId || !userId) throw new Error('No session');
      return createProductUseCase.execute(input, orgId, userId);
    },
    onSuccess: (result) => {
      if (result.success) { toast.success('Product created'); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['stockMovements'] }); }
      else toast.error(result.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (!can(role, 'inventory:update')) throw new Error('Permission denied');
      return productRepository.update(id, data);
    },
    onSuccess: () => { toast.success('Product updated'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  const { userId, role } = useSession();
  return useMutation({
    mutationFn: (id: string) => {
      if (!can(role, 'inventory:delete')) throw new Error('Permission denied');
      return productRepository.update(id, { isActive: false, archivedAt: new Date(), archivedBy: userId } as unknown as Partial<Product>);
    },
    onSuccess: () => { toast.success('Product archived'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useHardDeleteProduct() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!can(role, 'inventory:delete')) throw new Error('Permission denied');
      const serials = await serializedItemRepository.findByProductId(id);
      for (const s of serials) await serializedItemRepository.delete(s.id);
      await productRepository.delete(id);
    },
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['serializedItems'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchivedProducts(orgId: string) {
  return useQuery({
    queryKey: ['products', orgId],
    queryFn: () => productRepository.findByOrgId(orgId),
    enabled: !!orgId,
    select: useCallback((data: Product[]) => data.filter((p) => (p as unknown as Record<string, unknown>).isActive === false), []),
  });
}

export function useUnarchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      productRepository.update(id, { isActive: true, archivedAt: null, archivedBy: null } as unknown as Partial<Product>),
    onSuccess: () => { toast.success('Product restored'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useLowStockProducts(orgId: string, threshold: number) {
  return useQuery({
    queryKey: ['products', 'low-stock', orgId, threshold],
    queryFn: () => productRepository.getLowStock(orgId, threshold),
    enabled: !!orgId,
  });
}

export function useStockValue(orgId: string) {
  return useQuery({
    queryKey: ['products', 'stock-value', orgId],
    queryFn: () => productRepository.getStockValue(orgId),
    enabled: !!orgId,
  });
}

/* ────── Stock Movements ────── */

export function useStockMovements(productId: string) {
  return useQuery({
    queryKey: ['stockMovements', productId],
    queryFn: () => stockMovementRepository.findByProductId(productId),
    enabled: !!productId,
  });
}

export function useAllStockMovements(orgId: string, options?: { limit?: number; productId?: string }) {
  return useQuery({
    queryKey: ['stockMovements', orgId, options],
    queryFn: () => stockMovementRepository.findByOrgId(orgId, options),
    enabled: !!orgId,
  });
}

export function useRecordStockMovement() {
  const qc = useQueryClient();
  const { orgId, userId, role } = useSession();
  return useMutation({
    mutationFn: (input: unknown) => {
      if (!can(role, 'inventory:update')) throw new Error('Permission denied');
      if (!orgId || !userId) throw new Error('No session');
      return recordStockMovementUseCase.execute(input, orgId, userId);
    },
    onSuccess: (result) => {
      if (result.success) { toast.success('Stock movement recorded'); qc.invalidateQueries({ queryKey: ['stockMovements'] }); qc.invalidateQueries({ queryKey: ['products'] }); }
      else toast.error(result.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnarchiveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      categoryRepository.update(id, { isActive: true, archivedAt: null, archivedBy: null } as unknown as Partial<Category>),
    onSuccess: () => { toast.success('Category restored'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

/* ────── Suppliers ────── */

export function useSuppliers(orgId: string) {
  return useQuery({
    queryKey: ['suppliers', orgId],
    queryFn: () => supplierRepository.findByOrgId(orgId),
    enabled: !!orgId,
    select: useCallback((data: Supplier[]) => data.filter((s) => (s as unknown as Record<string, unknown>).isActive !== false), []),
  });
}

export function useSupplierByPhone(orgId: string, phone: string) {
  const [debouncedPhone, setDebouncedPhone] = useState(phone);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhone(phone.trim()), 400);
    return () => clearTimeout(timer);
  }, [phone]);
  const enabled = !!orgId && debouncedPhone.length >= 10;
  return useQuery({
    queryKey: ['suppliers', orgId, 'phone', debouncedPhone],
    queryFn: () => supplierRepository.findByPhone(orgId, debouncedPhone),
    enabled,
    select: useCallback((s: Supplier | null) => (s && (s as unknown as Record<string, unknown>).isActive !== false ? s : null), []),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  const { orgId, userId, role } = useSession();
  return useMutation({
    mutationFn: (input: unknown) => {
      if (!can(role, 'supplier:create')) throw new Error('Permission denied');
      if (!orgId || !userId) throw new Error('No session');
      return createSupplierUseCase.execute(input, orgId, userId);
    },
    onSuccess: (result) => {
      if (result.success) { toast.success('Supplier created'); qc.invalidateQueries({ queryKey: ['suppliers'] }); }
      else toast.error(result.error.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (!can(role, 'supplier:update')) throw new Error('Permission denied');
      return supplierRepository.update(id, data);
    },
    onSuccess: () => { toast.success('Supplier updated'); qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchiveSupplier() {
  const qc = useQueryClient();
  const { userId, role } = useSession();
  return useMutation({
    mutationFn: (id: string) => {
      if (!can(role, 'supplier:delete')) throw new Error('Permission denied');
      return supplierRepository.update(id, { isActive: false, archivedAt: new Date(), archivedBy: userId } as unknown as Partial<Supplier>);
    },
    onSuccess: () => { toast.success('Supplier archived'); qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useHardDeleteSupplier() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!can(role, 'supplier:delete')) throw new Error('Permission denied');
      const movements = await stockMovementRepository.findByOrgId('', {});
      const hasMovements = movements.some(m => m.supplierId === id);
      if (hasMovements) throw new Error('Cannot delete supplier with stock movement history. Archive instead.');
      await supplierRepository.delete(id);
    },
    onSuccess: () => { toast.success('Supplier deleted'); qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnarchiveSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      supplierRepository.update(id, { isActive: true, archivedAt: null, archivedBy: null } as unknown as Partial<Supplier>),
    onSuccess: () => { toast.success('Supplier restored'); qc.invalidateQueries({ queryKey: ['suppliers'] }); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchivedSuppliers(orgId: string) {
  return useQuery({
    queryKey: ['suppliers', orgId, 'archived'],
    queryFn: async () => {
      const all = await supplierRepository.findByOrgId(orgId);
      return all.filter((s) => (s as unknown as Record<string, unknown>).isActive === false);
    },
    enabled: !!orgId,
  });
}

/* ────── Dashboard ────── */

export function useInventoryDashboardData(orgId: string) {
  const productsQ = useProducts(orgId);
  const stockValueQ = useStockValue(orgId);
  const movementsQ = useAllStockMovements(orgId, { limit: 50 });

  return useMemo(() => {
    const products = productsQ.data ?? [];
    const stockValue = stockValueQ.data ?? { total: 0, byCategory: {} };
    const movements = movementsQ.data ?? [];

    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.currentStock <= p.lowStockThreshold).length;
    const outOfStockCount = products.filter(p => p.currentStock === 0).length;
    const totalValue = stockValue.total;
    const todayMovements = movements.filter(m => {
      const d = new Date(m.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    const expiringSoon = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalValue,
      todayMovements,
      expiringSoon,
      isLoading: productsQ.isLoading || stockValueQ.isLoading,
      error: productsQ.error || stockValueQ.error,
    };
  }, [productsQ, stockValueQ, movementsQ]);
}

/* ────── Serialized Items ────── */

export function useSerializedItems(productId: string) {
  return useQuery({
    queryKey: ['serializedItems', productId],
    queryFn: () => serializedItemRepository.findByProductId(productId),
    enabled: !!productId,
  });
}

export function useAvailableSerializedItems(productId: string) {
  return useQuery({
    queryKey: ['serializedItems', productId, 'available'],
    queryFn: () => serializedItemRepository.findAvailableByProductId(productId),
    enabled: !!productId,
  });
}

export function useCreateSerializedItems() {
  const qc = useQueryClient();
  const { orgId, role } = useSession();
  return useMutation({
    mutationFn: ({ productId, serialNumbers }: { productId: string; serialNumbers: string[] }) => {
      if (!can(role, 'inventory:create')) throw new Error('Permission denied');
      return serializedItemRepository.bulkCreate(
        serialNumbers.map(sn => ({ orgId, productId, serialNumber: sn, isAvailable: true }))
      );
    },
    onSuccess: (_data, vars) => {
      toast.success(`${vars.serialNumbers.length} serialized item(s) created`);
      qc.invalidateQueries({ queryKey: ['serializedItems', vars.productId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveSerializedItems() {
  const qc = useQueryClient();
  const { role } = useSession();
  return useMutation({
    mutationFn: async (vars: { ids: string[]; productId: string }) => {
      if (!can(role, 'inventory:update')) throw new Error('Permission denied');
      for (const id of vars.ids) {
        await serializedItemRepository.update(id, { isAvailable: false } as Partial<SerializedItem>);
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(`${vars.ids.length} item(s) removed from stock`);
      qc.invalidateQueries({ queryKey: ['serializedItems', vars.productId] });
      qc.invalidateQueries({ queryKey: ['serializedItems', vars.productId, 'available'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
