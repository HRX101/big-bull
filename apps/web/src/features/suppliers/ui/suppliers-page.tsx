'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Plus,
  X,
  Edit,
  Trash2,
  Archive,
  AlertTriangle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
} from 'lucide-react';
import type { Supplier, SupplierPurchaseEntry } from '@car-spa/domain';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useArchiveSupplier,
  useHardDeleteSupplier,
  useSupplierByPhone,
  useSupplierPurchases,
  useAddSupplierPurchase,
} from '@/features/inventory/api/use-inventory';

const SUPPLIER_PAGE_SIZE = 5;
const PURCHASE_PAGE_SIZE = 8;
type PurchaseFilter = 'ALL' | 'PURCHASE' | 'ADVANCE';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
}

function outstanding(supplier: Supplier) {
  return supplier.totalAmount - supplier.advanceAmount;
}

export function SuppliersPage() {
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const suppliersQ = useSuppliers(orgId);
  const suppliers = suppliersQ.data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Procurement"
        title="Suppliers"
        description="Manage suppliers, balances, and purchase history"
        action={<CreateSupplierDialog />}
      />

      <SuppliersWorkspace
        suppliers={suppliers}
        isLoading={suppliersQ.isLoading}
        error={suppliersQ.error}
        onRefetch={() => suppliersQ.refetch()}
      />
    </motion.div>
  );
}

function SuppliersWorkspace({
  suppliers,
  isLoading,
  error,
  onRefetch,
}: {
  suppliers: Supplier[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierPage, setSupplierPage] = useState(0);

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          !searchQuery ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.contactPhone ?? '').includes(searchQuery),
      ),
    [suppliers, searchQuery],
  );

  const supplierTotalPages = Math.max(1, Math.ceil(filtered.length / SUPPLIER_PAGE_SIZE));
  const safeSupplierPage = Math.min(supplierPage, supplierTotalPages - 1);
  const pagedSuppliers = filtered.slice(
    safeSupplierPage * SUPPLIER_PAGE_SIZE,
    (safeSupplierPage + 1) * SUPPLIER_PAGE_SIZE,
  );

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) ?? null;

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="text-destructive h-8 w-8" />
        <p className="text-muted-foreground">Failed to load suppliers.</p>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search suppliers…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSupplierPage(0);
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            description={searchQuery ? 'Try a different search term.' : 'Add your first supplier.'}
            action={!searchQuery ? <CreateSupplierDialog /> : undefined}
          />
        ) : (
          <>
            <nav className="space-y-2">
              {pagedSuppliers.map((supplier) => (
                <SupplierListCard
                  key={supplier.id}
                  supplier={supplier}
                  selected={selectedSupplierId === supplier.id}
                  onSelect={() => setSelectedSupplierId(supplier.id)}
                />
              ))}
            </nav>
            <PaginationControls
              page={safeSupplierPage}
              totalPages={supplierTotalPages}
              onPageChange={setSupplierPage}
              itemCount={filtered.length}
              itemLabel="suppliers"
            />
          </>
        )}
      </aside>

      <div className="min-w-0 flex-1 pt-2 lg:pt-1">
        {!selectedSupplier ? (
          <EmptyState
            title="Select a supplier"
            description="Choose a supplier to view balances and purchase history."
          />
        ) : (
          <SupplierDetailPanel supplier={selectedSupplier} />
        )}
      </div>
    </div>
  );
}

function SupplierListCard({
  supplier,
  selected,
  onSelect,
}: {
  supplier: Supplier;
  selected: boolean;
  onSelect: () => void;
}) {
  const due = outstanding(supplier);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex items-start gap-2">
        <Truck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{supplier.name}</p>
          {supplier.contactPhone && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3" />
              {supplier.contactPhone}
            </p>
          )}
          <p
            className={`mt-2 text-sm font-semibold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {fmt(Math.abs(due))}
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              {due > 0 ? 'due' : due < 0 ? 'credit' : 'settled'}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}

function SupplierDetailPanel({ supplier }: { supplier: Supplier }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'archive' | 'delete'>('archive');
  const [editing, setEditing] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'PURCHASE' | 'ADVANCE'>('PURCHASE');
  const [typeFilter, setTypeFilter] = useState<PurchaseFilter>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [purchasePage, setPurchasePage] = useState(0);

  const purchasesQ = useSupplierPurchases(supplier.id);
  const archiveSup = useArchiveSupplier();
  const deleteSup = useHardDeleteSupplier();
  const updateSup = useUpdateSupplier();

  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.contactPhone ?? '');
  const [notes, setNotes] = useState(supplier.notes ?? '');

  useEffect(() => {
    setName(supplier.name);
    setPhone(supplier.contactPhone ?? '');
    setNotes(supplier.notes ?? '');
    setEditing(false);
    setPurchasePage(0);
    setTypeFilter('ALL');
    setHistorySearch('');
  }, [supplier.id, supplier.name, supplier.contactPhone, supplier.notes]);

  const filteredEntries = useMemo(() => {
    const entries = purchasesQ.data ?? [];
    return entries.filter((entry) => {
      if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false;
      if (historySearch && !entry.description.toLowerCase().includes(historySearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [purchasesQ.data, typeFilter, historySearch]);

  const purchaseTotalPages = Math.max(1, Math.ceil(filteredEntries.length / PURCHASE_PAGE_SIZE));
  const safePurchasePage = Math.min(purchasePage, purchaseTotalPages - 1);
  const pagedEntries = filteredEntries.slice(
    safePurchasePage * PURCHASE_PAGE_SIZE,
    (safePurchasePage + 1) * PURCHASE_PAGE_SIZE,
  );

  const due = outstanding(supplier);

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-wrap items-start justify-between gap-4 px-5 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-6">
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="sup-edit-name">Name</Label>
                      <Input
                        id="sup-edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sup-edit-phone">Phone</Label>
                      <Input
                        id="sup-edit-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sup-edit-notes">Notes</Label>
                    <Input
                      id="sup-edit-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateSup.mutateAsync({
                          id: supplier.id,
                          data: {
                            name: name.trim(),
                            contactPhone: phone || null,
                            notes: notes || null,
                          },
                        });
                        setEditing(false);
                      }}
                      disabled={updateSup.isPending}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{supplier.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(true)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                        aria-label="Edit supplier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmType('archive');
                          setConfirmOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                        aria-label="Archive supplier"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmType('delete');
                          setConfirmOpen(true);
                        }}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
                        aria-label="Delete supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {supplier.contactPhone && (
                    <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      {supplier.contactPhone}
                    </p>
                  )}
                  {supplier.notes && (
                    <p className="text-muted-foreground mt-2 text-sm">{supplier.notes}</p>
                  )}
                </>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-4 text-right sm:gap-6">
              <div>
                <p className="text-muted-foreground text-xs">Total Amount</p>
                <p className="font-semibold">{fmt(supplier.totalAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Advance Amount</p>
                <p className="font-semibold text-emerald-600">{fmt(supplier.advanceAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Outstanding</p>
                <p className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {fmt(Math.abs(due))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setPurchaseType('PURCHASE');
              setPurchaseDialogOpen(true);
            }}
          >
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Record Purchase
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPurchaseType('ADVANCE');
              setPurchaseDialogOpen(true);
            }}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Record Advance
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4 pb-3">
            <CardTitle className="text-base">Purchase History</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="bg-muted/60 flex w-fit items-center gap-1 rounded-lg border p-0.5">
                {(['ALL', 'PURCHASE', 'ADVANCE'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={typeFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setTypeFilter(filter);
                      setPurchasePage(0);
                    }}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'PURCHASE' ? 'Purchases' : 'Advances'}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Filter by description…"
                  className="pl-10"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setPurchasePage(0);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {purchasesQ.isLoading ? (
              <div className="space-y-2 px-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Running Total</th>
                        <th className="px-4 py-3 text-right font-medium">Running Advance</th>
                        <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                            No purchase history found.
                          </td>
                        </tr>
                      ) : (
                        <PurchaseHistoryRows
                          entries={filteredEntries}
                          rendered={pagedEntries}
                          currentTotal={supplier.totalAmount}
                          currentAdvance={supplier.advanceAmount}
                        />
                      )}
                    </tbody>
                  </table>
                </div>
                {purchaseTotalPages > 1 && (
                  <div className="px-4 pt-4">
                    <PaginationControls
                      page={safePurchasePage}
                      totalPages={purchaseTotalPages}
                      onPageChange={setPurchasePage}
                      itemCount={filteredEntries.length}
                      itemLabel="entries"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PurchaseEntryDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        supplierId={supplier.id}
        type={purchaseType}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (confirmType === 'archive') await archiveSup.mutateAsync(supplier.id);
          else await deleteSup.mutateAsync(supplier.id);
        }}
        title={confirmType === 'archive' ? 'Archive Supplier' : 'Delete Supplier'}
        description={
          confirmType === 'archive'
            ? `Archive "${supplier.name}"? It will be hidden from product forms.`
            : `Permanently delete "${supplier.name}"? Only possible if no stock movements reference this supplier.`
        }
        variant={confirmType === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmType === 'archive' ? 'Archive' : 'Delete'}
        loading={archiveSup.isPending || deleteSup.isPending}
      />
    </>
  );
}

function PurchaseHistoryRows({
  entries,
  rendered,
  currentTotal,
  currentAdvance,
}: {
  entries: SupplierPurchaseEntry[];
  rendered: SupplierPurchaseEntry[];
  currentTotal: number;
  currentAdvance: number;
}) {
  const running = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalDelta = sorted.reduce((sum, e) => sum + (e.type === 'PURCHASE' ? e.amount : 0), 0);
    const advanceDelta = sorted.reduce((sum, e) => sum + (e.type === 'ADVANCE' ? e.amount : 0), 0);

    let runTotal = currentTotal - totalDelta;
    let runAdvance = currentAdvance - advanceDelta;
    const map = new Map<string, { total: number; advance: number; outstanding: number }>();

    for (const entry of sorted) {
      if (entry.type === 'PURCHASE') runTotal += entry.amount;
      else runAdvance += entry.amount;
      map.set(entry.id, {
        total: runTotal,
        advance: runAdvance,
        outstanding: runTotal - runAdvance,
      });
    }
    return map;
  }, [entries, currentTotal, currentAdvance]);

  return (
    <>
      {rendered.map((entry) => {
        const values = running.get(entry.id);
        return (
          <motion.tr
            key={entry.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="hover:bg-muted/30"
          >
            <td className="text-muted-foreground px-4 py-3">
              {entry.createdAt.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </td>
            <td className="px-4 py-3">
              <Badge
                variant={entry.type === 'PURCHASE' ? 'destructive' : 'default'}
                className={
                  entry.type === 'ADVANCE'
                    ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15'
                    : undefined
                }
              >
                {entry.type}
              </Badge>
            </td>
            <td className="max-w-xs truncate px-4 py-3">{entry.description}</td>
            <td
              className={`px-4 py-3 text-right font-medium tabular-nums ${
                entry.type === 'PURCHASE' ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {entry.type === 'PURCHASE' ? '+' : '−'}
              {fmt(entry.amount)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{fmt(values?.total ?? 0)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmt(values?.advance ?? 0)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmt(values?.outstanding ?? 0)}</td>
          </motion.tr>
        );
      })}
    </>
  );
}

function PurchaseEntryDialog({
  open,
  onOpenChange,
  supplierId,
  type,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  type: 'PURCHASE' | 'ADVANCE';
}) {
  const addPurchase = useAddSupplierPurchase();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setAmount('');
      setDescription('');
    }
  }, [open, type]);

  if (!open) return null;

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    const result = await addPurchase.mutateAsync({
      supplierId,
      type,
      amount: parsedAmount,
      description:
        description.trim() || (type === 'PURCHASE' ? 'Purchase recorded' : 'Advance paid'),
    });
    if (!result.success) return;
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{type === 'PURCHASE' ? 'Record Purchase' : 'Record Advance'}</CardTitle>
          <button onClick={() => onOpenChange(false)} className="hover:bg-muted rounded p-1">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="purchase-amount">Amount (₹)</Label>
            <Input
              id="purchase-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="purchase-description">Description</Label>
            <Input
              id="purchase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'PURCHASE' ? 'Invoice or purchase note' : 'Advance payment note'
              }
            />
          </div>
          <Button
            className="w-full"
            onClick={() => void handleSubmit()}
            disabled={addPurchase.isPending || !amount || Number(amount) <= 0}
          >
            {addPurchase.isPending ? 'Saving…' : 'Save Entry'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateSupplierDialog() {
  const createSupplier = useCreateSupplier();
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const existingQ = useSupplierByPhone(orgId, phone);

  useEffect(() => {
    if (!open) return;
    const existing = existingQ.data;
    if (existing && !name.trim()) setName(existing.name);
  }, [existingQ.data, open, name]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    const result = await createSupplier.mutateAsync({
      name: name.trim(),
      contactPhone: phone || undefined,
      notes: notes || undefined,
      totalAmount: Number(totalAmount) || 0,
      advanceAmount: Number(advanceAmount) || 0,
    });
    if (!result.success) return;
    setOpen(false);
    setName('');
    setPhone('');
    setNotes('');
    setTotalAmount('');
    setAdvanceAmount('');
    setDirty(false);
  };

  const handleClose = () => {
    if (dirty) setDiscardOpen(true);
    else setOpen(false);
  };

  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Supplier
      </Button>
    );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-sup-title"
      >
        <div
          className="bg-background w-full max-w-md rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b p-4">
            <h2 id="create-sup-title" className="text-lg font-semibold">
              Add Supplier
            </h2>
            <button onClick={handleClose} className="hover:bg-muted rounded p-1" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 p-4">
            <Field label="Supplier Name" required id="sup-create-name">
              <Input
                id="sup-create-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
                placeholder="Supplier name"
              />
            </Field>
            <Field label="Contact Phone" id="sup-create-phone">
              <Input
                id="sup-create-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setDirty(true);
                }}
                placeholder="Contact number"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Total Amount" id="sup-create-total">
                <Input
                  id="sup-create-total"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Advance Amount" id="sup-create-advance">
                <Input
                  id="sup-create-advance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={advanceAmount}
                  onChange={(e) => {
                    setAdvanceAmount(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <Field label="Notes" id="sup-create-notes">
              <Input
                id="sup-create-notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                placeholder="Notes about this supplier"
              />
            </Field>
            <Button
              className="w-full"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || createSupplier.isPending}
            >
              {createSupplier.isPending ? 'Creating...' : 'Add Supplier'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => {
          setDiscardOpen(false);
          setOpen(false);
          setDirty(false);
        }}
        title="Discard changes?"
        description="You have unsaved changes. They will be lost if you close this dialog."
        confirmLabel="Discard"
        variant="warning"
        icon={AlertTriangle}
      />
    </>
  );
}

function Field({
  label,
  required,
  children,
  id,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
