'use client';

import { useState, useReducer, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Search,
  ReceiptText,
  Hash,
  Wallet,
  User,
  Banknote,
  Smartphone,
  CreditCard,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { PAYMENT_MODES } from '@car-spa/shared';
import type { PaymentMode } from '@car-spa/shared';
import type { Product, POSSale, SerializedItem } from '@car-spa/domain';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination';
import { CartItem, type CartItemData } from './cart-item';
import { ReceiptModal } from './receipt-modal';
import { SerialSelectDialog } from './serial-select-dialog';
import { TransactionsPage } from './transactions-page';
import {
  useInventoryItems,
  useCustomers,
  useSales,
  useCreateSale,
  useDailyTotal,
  useAllSerializedItems,
} from '../api/use-pos';

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItemData }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR' };

const PAGE_SIZE = 5;

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net Banking',
  OTHER: 'Other',
};

const PAYMENT_BADGE: Record<string, string> = {
  CASH: 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  UPI: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400',
  CARD: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  NET_BANKING: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400',
  OTHER: 'bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-400',
};

function cartReducer(state: CartItemData[], action: CartAction): CartItemData[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.find((i) => i.itemId === action.payload.itemId);
      if (existing) {
        const serialNumbers = action.payload.serialNumbers?.length
          ? [...(existing.serialNumbers ?? []), ...action.payload.serialNumbers]
          : existing.serialNumbers;
        return state.map((i) =>
          i.itemId === action.payload.itemId
            ? { ...i, quantity: i.quantity + action.payload.quantity, serialNumbers }
            : i,
        );
      }
      return [...state, action.payload];
    }
    case 'REMOVE_ITEM':
      return state.filter((i) => i.itemId !== action.payload);
    case 'UPDATE_QUANTITY':
      return state.map((i) =>
        i.itemId === action.payload.itemId
          ? {
              ...i,
              quantity: action.payload.quantity,
              serialNumbers: i.serialNumbers?.length
                ? i.serialNumbers.slice(0, action.payload.quantity)
                : i.serialNumbers,
            }
          : i,
      );
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function POSPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';

  const [cart, dispatch] = useReducer(cartReducer, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [completedSale, setCompletedSale] = useState<POSSale | null>(null);
  const [view, setView] = useState<'sell' | 'transactions'>('sell');
  const [inventoryPage, setInventoryPage] = useState(0);
  const [customerPage, setCustomerPage] = useState(0);
  const [recentSalesPage, setRecentSalesPage] = useState(0);
  const [serialDialogProduct, setSerialDialogProduct] = useState<Product | null>(null);

  const inventoryQuery = useInventoryItems(orgId);
  const customersQuery = useCustomers(orgId);
  const salesQuery = useSales(orgId);
  const dailyTotalQuery = useDailyTotal(orgId);
  const serializedQuery = useAllSerializedItems(orgId);
  const createSaleMutation = useCreateSale();

  const serialByProduct = useMemo(() => {
    const map = new Map<string, SerializedItem[]>();
    for (const serial of serializedQuery.data ?? []) {
      const arr = map.get(serial.productId) ?? [];
      arr.push(serial);
      map.set(serial.productId, arr);
    }
    return map;
  }, [serializedQuery.data]);

  const serialDialogAvailable = useMemo(() => {
    if (!serialDialogProduct) return [];
    const inCart = new Set(
      cart.find((i) => i.itemId === serialDialogProduct.id)?.serialNumbers ?? [],
    );
    return (serialByProduct.get(serialDialogProduct.id) ?? []).filter(
      (s) => s.isAvailable && !inCart.has(s.serialNumber),
    );
  }, [serialDialogProduct, serialByProduct, cart]);

  const serialDialogExistingCount = useMemo(
    () =>
      serialDialogProduct
        ? (cart.find((i) => i.itemId === serialDialogProduct.id)?.quantity ?? 0)
        : 0,
    [serialDialogProduct, cart],
  );

  const filteredItems = useMemo(() => {
    if (!inventoryQuery.data) return [];
    if (!searchQuery) return inventoryQuery.data;
    const lower = searchQuery.toLowerCase();
    return inventoryQuery.data.filter(
      (i) => i.name.toLowerCase().includes(lower) || i.sku.toLowerCase().includes(lower),
    );
  }, [inventoryQuery.data, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customersQuery.data) return [];
    if (!customerSearch) return customersQuery.data;
    const lower = customerSearch.toLowerCase();
    return customersQuery.data.filter(
      (c) => c.name.toLowerCase().includes(lower) || c.phone.includes(customerSearch),
    );
  }, [customersQuery.data, customerSearch]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cart],
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const inventoryTotalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeInventoryPage = Math.min(inventoryPage, inventoryTotalPages - 1);
  const pagedFilteredItems = filteredItems.slice(
    safeInventoryPage * PAGE_SIZE,
    (safeInventoryPage + 1) * PAGE_SIZE,
  );

  const customerTotalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safeCustomerPage = Math.min(customerPage, customerTotalPages - 1);
  const pagedFilteredCustomers = filteredCustomers.slice(
    safeCustomerPage * PAGE_SIZE,
    (safeCustomerPage + 1) * PAGE_SIZE,
  );

  const salesData = salesQuery.data ?? [];
  const recentSalesTotalPages = Math.max(1, Math.ceil(salesData.length / PAGE_SIZE));
  const safeRecentSalesPage = Math.min(recentSalesPage, recentSalesTotalPages - 1);
  const pagedRecentSales = salesData.slice(
    safeRecentSalesPage * PAGE_SIZE,
    (safeRecentSalesPage + 1) * PAGE_SIZE,
  );

  function toggleSelectItem(itemId: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleProductClick(item: Product) {
    const productSerials = serialByProduct.get(item.id) ?? [];
    const hasAvailableSerials = productSerials.some((s) => s.isAvailable);
    if (productSerials.length > 0) {
      if (hasAvailableSerials) {
        setSerialDialogProduct(item);
      } else {
        toast.error(`No serial numbers available for ${item.name}`);
      }
      return;
    }
    toggleSelectItem(item.id);
  }

  function handleAddSerials(item: CartItemData) {
    const product = inventoryQuery.data?.find((p) => p.id === item.itemId);
    if (product) setSerialDialogProduct(product);
  }

  function handleSerialConfirm(selected: { serialNumber: string }[]) {
    if (!serialDialogProduct) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        itemId: serialDialogProduct.id,
        itemName: serialDialogProduct.name,
        quantity: selected.length,
        unitPrice: serialDialogProduct.sellingPrice,
        serialNumbers: selected.map((s) => s.serialNumber),
      },
    });
    setSerialDialogProduct(null);
  }

  function addSelectedToCart() {
    if (!inventoryQuery.data) return;
    for (const item of inventoryQuery.data) {
      if (selectedItemIds.has(item.id) && item.currentStock > 0) {
        dispatch({
          type: 'ADD_ITEM',
          payload: {
            itemId: item.id,
            itemName: item.name,
            quantity: 1,
            unitPrice: item.sellingPrice,
          },
        });
      }
    }
    setSelectedItemIds(new Set());
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (!selectedCustomerId) {
      toast.error('Please select a customer to checkout');
      return;
    }
    const result = await createSaleMutation.mutateAsync({
      items: cart.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        ...(i.serialNumbers?.length ? { serialNumbers: i.serialNumbers } : {}),
      })),
      paymentMode,
      customerId: selectedCustomerId ?? '',
    });

    if (result.success) {
      setCompletedSale(result.value);
      dispatch({ type: 'CLEAR' });
      setSelectedCustomerId(null);
      setCustomerSearch('');
      setPaymentMode('CASH');
    }
  }

  const selectedCustomerName = selectedCustomerId
    ? (customersQuery.data?.find((c) => c.id === selectedCustomerId)?.name ?? '')
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Billing"
        title="Point of Sale"
        description="Create walk-in sales and manage inventory."
        action={
          dailyTotalQuery.data !== undefined && (
            <div className="from-navy-light to-navy bg-navy shadow-navy/25 dark:from-navy-darker dark:to-navy-dark flex items-center gap-3 rounded-xl bg-gradient-to-r px-4 py-2.5 text-white shadow-lg ring-1 ring-white/10 dark:shadow-black/30">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/25 to-emerald-500/10 text-emerald-300 ring-1 ring-emerald-300/20">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-bold tracking-widest text-white/60 uppercase">
                  Today&apos;s Total
                </p>
                <p className="text-lg leading-tight font-extrabold tracking-tight tabular-nums">
                  ₹{dailyTotalQuery.data.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )
        }
      />

      <div className="bg-card inline-flex items-center gap-1 rounded-xl border border-slate-200 p-1 shadow-sm dark:border-slate-800">
        <button
          type="button"
          onClick={() => setView('sell')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            view === 'sell'
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm shadow-blue-900/25'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Sell
        </button>
        <button
          type="button"
          onClick={() => setView('transactions')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            view === 'transactions'
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm shadow-blue-900/25'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <ReceiptText className="h-4 w-4" />
          Transactions
        </button>
      </div>

      {view === 'sell' ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <Card>
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle>Search Inventory</CardTitle>
                    <p className="text-muted-foreground text-xs">
                      Click an item to add it to the cart
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search by name or SKU…"
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setInventoryPage(0);
                      }}
                    />
                  </div>

                  {inventoryQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <EmptyState title="No items found" description="Try a different search term." />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {pagedFilteredItems.map((item) => {
                          const selected = selectedItemIds.has(item.id);
                          const isSerialized = (serialByProduct.get(item.id) ?? []).length > 0;
                          const outOfStock = item.currentStock === 0;
                          const lowStock = item.currentStock <= item.lowStockThreshold;
                          const stockClass = outOfStock
                            ? 'bg-red-500/10 text-red-600 dark:bg-red-400/15 dark:text-red-400'
                            : lowStock
                              ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400'
                              : 'bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-400';
                          const stockLabel = outOfStock
                            ? 'Out of stock'
                            : lowStock
                              ? `Low · ${item.currentStock}`
                              : `${item.currentStock} in stock`;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleProductClick(item)}
                              disabled={outOfStock}
                              className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left text-sm transition-all duration-150 active:scale-[0.98] ${
                                selected
                                  ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/30 dark:bg-sky-500/10'
                                  : outOfStock
                                    ? 'cursor-not-allowed border-red-200/70 bg-red-50/50 opacity-60 dark:border-red-500/20 dark:bg-red-500/5'
                                    : 'border-slate-200 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10 dark:border-slate-800 dark:hover:border-sky-500/40'
                              }`}
                            >
                              <span className="flex w-full items-start justify-between gap-2">
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${stockClass}`}
                                >
                                  {item.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  {isSerialized && (
                                    <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
                                      <Hash className="h-3 w-3" />
                                      Serial
                                    </span>
                                  )}
                                  {selected && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                                      <Check className="h-3 w-3" />
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
                                  {item.name}
                                </span>
                                <span className="text-muted-foreground block text-[11px]">
                                  {item.sku}
                                </span>
                              </span>
                              <span className="mt-auto flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                                  ₹{item.sellingPrice.toFixed(2)}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${stockClass}`}
                                >
                                  {stockLabel}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <PaginationControls
                        page={safeInventoryPage}
                        totalPages={inventoryTotalPages}
                        onPageChange={setInventoryPage}
                        itemCount={filteredItems.length}
                        itemLabel="items"
                      />
                    </>
                  )}

                  {selectedItemIds.size > 0 && (
                    <Button
                      className="w-full bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/25 hover:from-sky-500 hover:to-blue-500"
                      onClick={addSelectedToCart}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add {selectedItemIds.size} selected item{selectedItemIds.size > 1 ? 's' : ''}{' '}
                      to cart
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle>
                      Cart{' '}
                      {itemCount > 0 && (
                        <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500/15 px-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                          {itemCount}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">Review items and checkout</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.length === 0 ? (
                    <EmptyState
                      title="Cart is empty"
                      description="Search and select inventory items to add to the cart."
                    />
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <CartItem
                          key={item.itemId}
                          item={item}
                          isSerialized={!!item.serialNumbers?.length}
                          onUpdateQuantity={(itemId, quantity) =>
                            dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } })
                          }
                          onAddSerials={handleAddSerials}
                          onRemove={(itemId) => dispatch({ type: 'REMOVE_ITEM', payload: itemId })}
                        />
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal ({itemCount} items)
                          </span>
                          <span className="text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                            ₹{subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-[13px] font-medium">Customer</Label>
                          <span className="text-destructive text-sm font-bold">*</span>
                        </div>
                        {selectedCustomerId ? (
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
                            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                {selectedCustomerName.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="truncate">{selectedCustomerName}</span>
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerId(null);
                                setCustomerSearch('');
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                              placeholder="Search customer by name or phone…"
                              className="pl-10"
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setCustomerPage(0);
                              }}
                            />
                          </div>
                        )}
                        {!selectedCustomerId && (
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            Select a customer to checkout
                          </p>
                        )}
                        {!selectedCustomerId && customerSearch && (
                          <div className="border-border max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
                            {pagedFilteredCustomers.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedCustomerId(c.id)}
                                className="hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm transition-colors"
                              >
                                <span className="font-medium">{c.name}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {c.phone}
                                </span>
                              </button>
                            ))}
                            {filteredCustomers.length === 0 && (
                              <p className="text-muted-foreground p-2 text-xs">
                                No customers found
                              </p>
                            )}
                            {filteredCustomers.length > 0 && (
                              <PaginationControls
                                page={safeCustomerPage}
                                totalPages={customerTotalPages}
                                onPageChange={setCustomerPage}
                                itemCount={filteredCustomers.length}
                                itemLabel="customers"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label className="text-[13px] font-medium">Payment Mode</Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {PAYMENT_MODES.map((mode) => {
                            const isSelected = paymentMode === mode;
                            const Icon = PAYMENT_ICONS[mode] ?? Wallet;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setPaymentMode(mode)}
                                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                                  isSelected
                                    ? 'border-sky-500 bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25'
                                    : 'bg-card text-muted-foreground hover:text-foreground border-slate-200 hover:border-sky-300 dark:border-slate-800 dark:hover:border-sky-500/40'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {PAYMENT_MODE_LABELS[mode] ?? mode}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {createSaleMutation.data && !createSaleMutation.data.success && (
                        <p className="text-destructive mt-2 text-sm">
                          {createSaleMutation.data.error.message}
                        </p>
                      )}

                      <Button
                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-sky-500 shadow-md shadow-blue-900/25 hover:from-blue-700 hover:to-sky-600"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={createSaleMutation.isPending || !selectedCustomerId}
                      >
                        {createSaleMutation.isPending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Processing…
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-5 w-5" />
                            Checkout — ₹
                            {subtotal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle>Recent Sales</CardTitle>
                    <p className="text-muted-foreground text-xs">Latest completed transactions</p>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto">
                  {salesQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : !salesQuery.data || salesQuery.data.length === 0 ? (
                    <EmptyState
                      title="No sales yet"
                      description="Completed sales will appear here."
                    />
                  ) : (
                    <>
                      {pagedRecentSales.map((sale) => {
                        const customer = sale.customerId
                          ? customersQuery.data?.find((c) => c.id === sale.customerId)
                          : null;
                        return (
                          <div
                            key={sale.id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm transition-all hover:border-sky-300/60 hover:shadow-md hover:shadow-sky-500/5 dark:border-slate-800 dark:hover:border-sky-500/40"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <ReceiptText className="text-muted-foreground h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-muted-foreground font-mono text-xs">
                                  #{sale.id.slice(0, 8)}
                                </p>
                                <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                                  {customer?.name ?? 'Walk-in'}
                                </p>
                                <p className="text-muted-foreground text-[11px]">
                                  {sale.createdAt.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                                ₹{sale.totalAmount.toLocaleString('en-IN')}
                              </p>
                              <span
                                className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  PAYMENT_BADGE[sale.paymentMode] ??
                                  'bg-slate-500/10 text-slate-600'
                                }`}
                              >
                                {PAYMENT_MODE_LABELS[sale.paymentMode] ?? sale.paymentMode}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <PaginationControls
                        page={safeRecentSalesPage}
                        totalPages={recentSalesTotalPages}
                        onPageChange={setRecentSalesPage}
                        itemCount={salesData.length}
                        itemLabel="sales"
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <ReceiptModal
            sale={completedSale}
            customerName={
              completedSale?.customerId
                ? customersQuery.data?.find((c) => c.id === completedSale.customerId)?.name
                : null
            }
            onClose={() => setCompletedSale(null)}
          />
          <SerialSelectDialog
            product={serialDialogProduct}
            available={serialDialogAvailable}
            existingCount={serialDialogExistingCount}
            open={!!serialDialogProduct}
            onClose={() => setSerialDialogProduct(null)}
            onConfirm={handleSerialConfirm}
          />
        </>
      ) : (
        <TransactionsPage />
      )}
    </motion.div>
  );
}
