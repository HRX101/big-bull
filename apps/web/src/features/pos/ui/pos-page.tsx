'use client';

import { useState, useReducer, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Search, CreditCard, ReceiptText } from 'lucide-react';
import { PAYMENT_MODES } from '@car-spa/shared';
import type { PaymentMode } from '@car-spa/shared';
import type { POSSale } from '@car-spa/domain';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { CartItem, type CartItemData } from './cart-item';
import { ReceiptModal } from './receipt-modal';
import { TransactionsPage } from './transactions-page';
import {
  useInventoryItems,
  useCustomers,
  useSales,
  useCreateSale,
  useDailyTotal,
} from '../api/use-pos';

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItemData }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR' };

function cartReducer(state: CartItemData[], action: CartAction): CartItemData[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.find((i) => i.itemId === action.payload.itemId);
      if (existing) {
        return state.map((i) =>
          i.itemId === action.payload.itemId
            ? { ...i, quantity: i.quantity + action.payload.quantity }
            : i,
        );
      }
      return [...state, action.payload];
    }
    case 'REMOVE_ITEM':
      return state.filter((i) => i.itemId !== action.payload);
    case 'UPDATE_QUANTITY':
      return state.map((i) =>
        i.itemId === action.payload.itemId ? { ...i, quantity: action.payload.quantity } : i,
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

  const inventoryQuery = useInventoryItems(orgId);
  const customersQuery = useCustomers(orgId);
  const salesQuery = useSales(orgId);
  const dailyTotalQuery = useDailyTotal(orgId);
  const createSaleMutation = useCreateSale();

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

  function toggleSelectItem(itemId: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function addSelectedToCart() {
    if (!inventoryQuery.data) return;
    for (const item of inventoryQuery.data) {
      if (selectedItemIds.has(item.id) && item.currentStock > 0) {
          dispatch({
            type: 'ADD_ITEM',
            payload: { itemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.sellingPrice },
        });
      }
    }
    setSelectedItemIds(new Set());
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    const result = await createSaleMutation.mutateAsync({
      items: cart.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
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
    ? customersQuery.data?.find((c) => c.id === selectedCustomerId)?.name ?? ''
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">Create walk-in sales and manage inventory.</p>
        </div>
        {dailyTotalQuery.data !== undefined && (
          <div className="rounded-lg border px-4 py-2 text-right">
            <p className="text-muted-foreground text-xs">Today&apos;s Total</p>
            <p className="text-xl font-bold">₹{dailyTotalQuery.data.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView('sell')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === 'sell'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Sell
        </button>
        <button
          type="button"
          onClick={() => setView('transactions')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            view === 'transactions'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="text-muted-foreground h-5 w-5" />
                <CardTitle>Search Inventory</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by name or SKU…"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredItems.map((item) => {
                    const selected = selectedItemIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleSelectItem(item.id)}
                        disabled={item.currentStock === 0}
                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : item.currentStock === 0
                              ? 'border-destructive/30 bg-destructive/5 cursor-not-allowed opacity-50'
                              : 'hover:border-muted-foreground/30'
                        }`}
                      >
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="text-muted-foreground text-xs">{item.sku}</span>
                        <span className="mt-1 font-semibold">₹{item.sellingPrice.toFixed(2)}</span>
                        <span
                          className={`text-xs ${
                            item.currentStock <= item.lowStockThreshold
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}
                        >
                          Stock: {item.currentStock}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedItemIds.size > 0 && (
                <Button className="w-full" onClick={addSelectedToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add {selectedItemIds.size} selected item{selectedItemIds.size > 1 ? 's' : ''} to
                  cart
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-muted-foreground h-5 w-5" />
                <CardTitle>Cart ({itemCount} items)</CardTitle>
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
                      onUpdateQuantity={(itemId, quantity) =>
                        dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } })
                      }
                      onRemove={(itemId) => dispatch({ type: 'REMOVE_ITEM', payload: itemId })}
                    />
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                    <span className="text-lg font-bold">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Customer (optional)</Label>
                    {selectedCustomerId ? (
                      <div className="flex items-center justify-between rounded-lg border p-2">
                        <span className="text-sm font-medium">{selectedCustomerName}</span>
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
                          onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                      </div>
                    )}
                    {!selectedCustomerId && customerSearch && (
                      <div className="border-border max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm transition-colors"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>
                          </button>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <p className="text-muted-foreground p-2 text-xs">No customers found</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <select
                      id="paymentMode"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode === 'CASH'
                            ? 'Cash'
                            : mode === 'UPI'
                              ? 'UPI'
                              : mode === 'CARD'
                                ? 'Card'
                                : mode === 'NET_BANKING'
                                  ? 'Net Banking'
                                  : mode === 'OTHER'
                                    ? 'Other'
                                    : mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {createSaleMutation.data && !createSaleMutation.data.success && (
                    <p className="text-destructive mt-2 text-sm">
                      {createSaleMutation.data.error.message}
                    </p>
                  )}

                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={createSaleMutation.isPending}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {createSaleMutation.isPending ? 'Processing…' : `Checkout — ₹${subtotal.toFixed(2)}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto">
              {salesQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !salesQuery.data || salesQuery.data.length === 0 ? (
                <EmptyState title="No sales yet" description="Completed sales will appear here." />
              ) : (
                salesQuery.data.map((sale) => {
                  const customer = sale.customerId
                    ? customersQuery.data?.find((c) => c.id === sale.customerId)
                    : null;
                  return (
                    <div
                      key={sale.id}
                      className="border-border space-y-1 rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{sale.id.slice(0, 8)}
                        </span>
                        <span className="font-semibold">
                          ₹{sale.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>{customer?.name ?? 'Walk-in'}</span>
                        <span>{sale.paymentMode}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {sale.createdAt.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ReceiptModal
        sale={completedSale}
        customerName={completedSale?.customerId ? customersQuery.data?.find((c) => c.id === completedSale.customerId)?.name : null}
        onClose={() => setCompletedSale(null)}
      />
      </>
      ) : (
        <TransactionsPage />
      )}
    </motion.div>
  );
}
