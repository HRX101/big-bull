'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicLedgerEntrySchema } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { useAddLedgerEntry } from '../api/use-mechanics';
import { useProducts } from '@/features/inventory/api/use-inventory';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, X, Search } from 'lucide-react';
import type { Product } from '@car-spa/domain';

const ledgerFormSchema = mechanicLedgerEntrySchema.extend({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

type LedgerFormInput = z.infer<typeof ledgerFormSchema>;

interface LedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanicId: string;
  defaultType?: 'CREDIT' | 'DEBIT';
}

interface ItemRow {
  productId: string;
  quantity: number;
}

export function LedgerEntryDialog({
  open,
  onOpenChange,
  mechanicId,
  defaultType = 'CREDIT',
}: LedgerEntryDialogProps) {
  const addEntry = useAddLedgerEntry();
  const overlayRef = useRef<HTMLDivElement>(null);
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const productsQ = useProducts(orgId);
  const products = productsQ.data ?? [];

  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>(defaultType);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LedgerFormInput>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: { mechanicId, type: defaultType, amount: 0, itemCount: 0, description: '' },
  });

  const [rows, setRows] = useState<ItemRow[]>([]);
  const [amountStr, setAmountStr] = useState('0');
  const [itemCountStr, setItemCountStr] = useState('0');

  useEffect(() => {
    if (open) {
      const t = defaultType;
      setEntryType(t);
      reset({
        mechanicId,
        type: t,
        amount: 0,
        itemCount: 0,
        description: '',
        fromDate: '',
        toDate: '',
      });
      setRows([]);
      setAmountStr('0');
      setItemCountStr('0');
    }
  }, [open, mechanicId, defaultType, reset]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const isCredit = entryType === 'CREDIT';

  const productName = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? 'Unknown product';

  const productStock = (productId: string) =>
    products.find((p) => p.id === productId)?.currentStock ?? 0;

  const upsertRow = (productId: string, quantity: number) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.productId === productId);
      if (existing) {
        return prev.map((r) =>
          r.productId === productId
            ? { ...r, quantity: Math.max(1, Math.floor(quantity) || 1) }
            : r,
        );
      }
      return [...prev, { productId, quantity: Math.max(1, Math.floor(quantity) || 1) }];
    });
  };

  const totalItemCount = rows.reduce((sum, r) => sum + r.quantity, 0);

  const buildItemsInput = () =>
    rows
      .filter((r) => r.productId && r.quantity > 0)
      .map((r) => ({
        productId: r.productId,
        productName: productName(r.productId),
        quantity: r.quantity,
      }));

  const onSubmit = handleSubmit(async (data) => {
    let description = data.description;
    if (isCredit && data.fromDate && data.toDate) {
      const dateRange = `Sales from ${data.fromDate} to ${data.toDate}`;
      description = description ? `${dateRange}: ${description}` : dateRange;
    }
    const items = isCredit ? undefined : buildItemsInput();
    const trackedItemCount =
      isCredit || !items || items.length === 0 ? (data.itemCount ?? null) : totalItemCount;
    const result = await addEntry.mutateAsync({
      mechanicId: data.mechanicId,
      type: entryType,
      amount: data.amount,
      itemCount: trackedItemCount,
      items,
      description,
    });
    if (!result.success) throw new Error(result.error?.message);
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-b-none sm:rounded-b-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>New Ledger Entry</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Entry Type</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-sm font-medium transition-colors sm:py-2 ${
                    entryType === 'CREDIT'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setEntryType('CREDIT');
                    setValue('type', 'CREDIT');
                  }}
                >
                  Sales (CREDIT)
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-sm font-medium transition-colors sm:py-2 ${
                    entryType === 'DEBIT'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setEntryType('DEBIT');
                    setValue('type', 'DEBIT');
                  }}
                >
                  Issue Items (DEBIT)
                </button>
              </div>
            </div>

            {isCredit && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input id="fromDate" type="date" {...register('fromDate')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input id="toDate" type="date" {...register('toDate')} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount (₹)</Label>
              <NumericInput
                id="amount"
                min={0}
                value={Number(amountStr) || 0}
                onChange={(v) => {
                  setAmountStr(String(v));
                  setValue('amount', v);
                }}
              />
              {errors.amount && (
                <p className="text-destructive text-sm">{errors.amount.message}</p>
              )}
            </div>
            {isCredit ? (
              <div className="space-y-2">
                <Label htmlFor="itemCount">Item Count Sold</Label>
                <NumericInput
                  id="itemCount"
                  min={0}
                  value={Number(itemCountStr) || 0}
                  onChange={(v) => {
                    setItemCountStr(String(v));
                    setValue('itemCount', v);
                  }}
                />
                {errors.itemCount && (
                  <p className="text-destructive text-sm">{errors.itemCount.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Products Taken</Label>
                {productsQ.isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading products…</p>
                ) : products.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No products available. Add products in Inventory first.
                  </p>
                ) : (
                  <>
                    {rows.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        Pick the products this mechanic is taking and their quantities.
                      </p>
                    )}
                    {rows.map((row) => (
                      <div key={row.productId} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Label className="text-xs">Product</Label>
                            <ProductSearchCombobox
                              products={products}
                              value={row.productId}
                              onSelect={(id) => {
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.productId === row.productId ? { ...r, productId: id } : r,
                                  ),
                                );
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive shrink-0"
                            onClick={() =>
                              setRows((prev) => prev.filter((r) => r.productId !== row.productId))
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <NumericInput
                              min={1}
                              value={row.quantity}
                              onChange={(v) => upsertRow(row.productId, v)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Stock</Label>
                            <p className="text-muted-foreground flex h-10 items-center px-3 text-sm">
                              {productStock(row.productId)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const firstAvailable = products.find(
                          (p) => !rows.some((r) => r.productId === p.id),
                        );
                        const target = firstAvailable ?? products[0];
                        if (target)
                          setRows((prev) => [...prev, { productId: target.id, quantity: 1 }]);
                      }}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Item
                    </Button>
                    {rows.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Total items tracked: {totalItemCount}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
              {errors.description && (
                <p className="text-destructive text-sm">{errors.description.message}</p>
              )}
            </div>
            {addEntry.isError && (
              <p className="text-destructive text-sm">{addEntry.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={addEntry.isPending}>
              {addEntry.isPending ? 'Saving…' : isCredit ? 'Record Sales' : 'Issue Items'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductSearchCombobox({
  products,
  value,
  onSelect,
}: {
  products: Product[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => p.id === value);

  const filtered = useMemo(() => {
    if (!query) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full items-center rounded-lg border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        {selected ? (
          <span className="truncate">{selected.name}</span>
        ) : (
          <span className="text-muted-foreground">Search products…</span>
        )}
      </button>
      {open && (
        <div className="bg-popover absolute z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-md">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
              <input
                type="search"
                inputMode="search"
                placeholder="Type to search…"
                className="border-input bg-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-md border pl-8 pr-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:h-9 sm:text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="max-h-[40vh] overflow-y-auto p-1 sm:max-h-60">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-3 py-2 text-sm">No products found.</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm hover:bg-accent sm:py-2 ${
                    p.id === value ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelect(p.id)}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                    Stock: {p.currentStock}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
