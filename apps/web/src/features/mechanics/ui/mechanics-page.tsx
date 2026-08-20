'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import {
  Search,
  Plus,
  Wrench,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Store,
  Phone,
  Trophy,
  Package,
  Repeat,
  ArrowLeft,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination';
import { useMechanics, useMechanicLedger, useMechanicLedgerByOrgId, useDeleteMechanic } from '../api/use-mechanics';
import { MechanicDialog } from './mechanic-dialog';
import { LedgerEntryDialog } from './ledger-entry-dialog';
import type { Mechanic, MechanicLedgerEntry } from '@car-spa/domain';

const LEDGER_PAGE_SIZE = 5;
const MECHANIC_PAGE_SIZE = 5;

interface MechanicStats {
  transactions: number;
  totalCredit: number;
  totalDebit: number;
  itemsTaken: number;
}

const EMPTY_STATS: MechanicStats = { transactions: 0, totalCredit: 0, totalDebit: 0, itemsTaken: 0 };

export function MechanicsPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [ledgerEntryType, setLedgerEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [ledgerPage, setLedgerPage] = useState(0);
  const [mechanicPage, setMechanicPage] = useState(0);

  const mechanicsQuery = useMechanics(orgId);
  const ledgerQuery = useMechanicLedger(selectedMechanicId ?? '');
  const orgLedgerQuery = useMechanicLedgerByOrgId(orgId);
  const deleteMechanic = useDeleteMechanic();

  const mechanics = mechanicsQuery.data ?? [];

  const statsByMechanic = useMemo(() => {
    const map = new Map<string, MechanicStats>();
    for (const e of orgLedgerQuery.data ?? []) {
      const s = map.get(e.mechanicId) ?? { ...EMPTY_STATS };
      s.transactions += 1;
      if (e.type === 'CREDIT') s.totalCredit += e.amount;
      else {
        s.totalDebit += e.amount;
        const itemQty = e.items?.reduce((sum, i) => sum + i.quantity, 0) ?? e.itemCount ?? 0;
        s.itemsTaken += itemQty;
      }
      map.set(e.mechanicId, s);
    }
    return map;
  }, [orgLedgerQuery.data]);

  const rankedMechanics = useMemo(() => {
    const all = mechanicsQuery.data ?? [];
    return [...all].sort((a, b) => {
      const sa = statsByMechanic.get(a.id) ?? EMPTY_STATS;
      const sb = statsByMechanic.get(b.id) ?? EMPTY_STATS;
      if (sb.totalCredit !== sa.totalCredit) return sb.totalCredit - sa.totalCredit;
      if (sb.transactions !== sa.transactions) return sb.transactions - sa.transactions;
      return sb.itemsTaken - sa.itemsTaken;
    });
  }, [mechanicsQuery.data, statsByMechanic]);

  const rankByMechanicId = useMemo(() => {
    const map = new Map<string, number>();
    rankedMechanics.forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [rankedMechanics]);

  const filtered = useMemo(
    () =>
      rankedMechanics.filter(
        (m) => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [rankedMechanics, searchQuery],
  );

  const selectedMechanic = useMemo(
    () => mechanics.find((m) => m.id === selectedMechanicId),
    [mechanics, selectedMechanicId],
  )!;

  const mechanicTotalPages = Math.max(1, Math.ceil(filtered.length / MECHANIC_PAGE_SIZE));
  const safeMechanicPage = Math.min(mechanicPage, mechanicTotalPages - 1);
  const pagedMechanics = filtered.slice(
    safeMechanicPage * MECHANIC_PAGE_SIZE,
    (safeMechanicPage + 1) * MECHANIC_PAGE_SIZE,
  );

  const ledgerEntries = ledgerQuery.data ?? [];
  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerEntries.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, ledgerTotalPages - 1);
  const pagedLedgerEntries = ledgerEntries.slice(
    safeLedgerPage * LEDGER_PAGE_SIZE,
    (safeLedgerPage + 1) * LEDGER_PAGE_SIZE,
  );

  const handleEditMechanic = useCallback((m: Mechanic) => {
    setEditingMechanic(m);
    setDialogOpen(true);
  }, []);

  const handleDeleteMechanic = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteMechanic.mutate(deleteConfirmId);
      if (selectedMechanicId === deleteConfirmId) setSelectedMechanicId(null);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteMechanic, selectedMechanicId]);

  const handleCancelDelete = useCallback(() => setDeleteConfirmId(null), []);

  function openLedgerDialog(type: 'CREDIT' | 'DEBIT') {
    setLedgerEntryType(type);
    setLedgerDialogOpen(true);
  }

  const handleSelectMechanic = useCallback((id: string) => {
    setSelectedMechanicId(id);
    setLedgerPage(0);
  }, []);

  const handleAddMechanic = useCallback(() => {
    setEditingMechanic(null);
    setDialogOpen(true);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMechanicId(null);
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className={`w-full shrink-0 space-y-4 lg:w-80 ${selectedMechanicId ? 'hidden lg:block' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Mechanics</h2>
          <Button size="sm" onClick={handleAddMechanic}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setMechanicPage(0);
            }}
          />
        </div>

        {mechanicsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No mechanics found"
            description={searchQuery ? 'Try a different search term.' : 'Add your first mechanic.'}
          />
        ) : (
          <>
            <nav className="space-y-2">
              {pagedMechanics.map((mechanic) => (
                <MechanicCard
                  key={mechanic.id}
                  mechanic={mechanic}
                  rank={rankByMechanicId.get(mechanic.id) ?? null}
                  stats={statsByMechanic.get(mechanic.id) ?? EMPTY_STATS}
                  selected={selectedMechanicId === mechanic.id}
                  onSelect={handleSelectMechanic}
                  onEdit={handleEditMechanic}
                  onDelete={handleDeleteMechanic}
                />
              ))}
            </nav>
            <PaginationControls
              page={safeMechanicPage}
              totalPages={mechanicTotalPages}
              onPageChange={setMechanicPage}
              itemCount={filtered.length}
              itemLabel="mechanics"
            />
          </>
        )}
      </aside>

      <div className={`min-w-0 flex-1 space-y-4 ${!selectedMechanicId ? 'hidden lg:block' : ''}`}>
        {!selectedMechanicId ? (
          <EmptyState
            title="Select a mechanic"
            description="Choose a mechanic from the sidebar to view their ledger."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 lg:hidden">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="truncate font-display text-lg">
                {selectedMechanic?.name ?? 'Mechanic'}
              </h2>
            </div>

            {ledgerQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                        <Wrench className="text-muted-foreground h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">{selectedMechanic.name}</h3>
                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                          <Store className="h-3.5 w-3.5" />
                          {selectedMechanic.storeName}
                          {selectedMechanic.phone && (
                            <>
                              <span className="text-muted-foreground/30">|</span>
                              <Phone className="h-3.5 w-3.5" />
                              {selectedMechanic.phone}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Current Balance</p>
                      <p
                        className={`text-2xl font-bold ${selectedMechanic.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        ₹{Math.abs(selectedMechanic.balance).toLocaleString('en-IN')}
                        <span className="ml-1 text-sm font-normal">
                          {selectedMechanic.balance >= 0 ? '(Dr)' : '(Cr)'}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                  {(statsByMechanic.get(selectedMechanic.id) ?? EMPTY_STATS) && (
                    <CardContent className="border-t px-4 py-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <Repeat className="text-muted-foreground h-4 w-4" />
                          <div>
                            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                              Transactions
                            </p>
                            <p className="text-sm font-semibold">
                              {statsByMechanic.get(selectedMechanic.id)?.transactions ?? 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="text-emerald-600 h-4 w-4" />
                          <div>
                            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                              Sales Entered
                            </p>
                            <p className="text-sm font-semibold">
                              ₹{(statsByMechanic.get(selectedMechanic.id)?.totalCredit ?? 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="text-amber-600 h-4 w-4" />
                          <div>
                            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                              Items Taken
                            </p>
                            <p className="text-sm font-semibold">
                              {statsByMechanic.get(selectedMechanic.id)?.itemsTaken ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => openLedgerDialog('CREDIT')}>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Enter Sales
                  </Button>
                  <Button variant="outline" onClick={() => openLedgerDialog('DEBIT')}>
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Issue Items
                  </Button>
                </div>

                {ledgerEntries.length === 0 ? (
                  <div className="text-muted-foreground rounded-lg border p-8 text-center text-sm">
                    No ledger entries yet.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="hidden w-full text-sm sm:table">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-right font-medium">Running Balance</th>
                            <th className="px-4 py-3 text-left font-medium">Actor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                          <LedgerRows
                            entries={ledgerEntries}
                            rendered={pagedLedgerEntries}
                            currentBalance={selectedMechanic.balance}
                          />
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2 sm:hidden">
                      <LedgerCards
                        entries={ledgerEntries}
                        rendered={pagedLedgerEntries}
                        currentBalance={selectedMechanic.balance}
                      />
                    </div>
                  </>
                )}

                {ledgerTotalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-xs">
                      Page {safeLedgerPage + 1} of {ledgerTotalPages} · {ledgerEntries.length} entries
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeLedgerPage === 0}
                        onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeLedgerPage >= ledgerTotalPages - 1}
                        onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages - 1, p + 1))}
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <MechanicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingMechanic={editingMechanic}
      />

      <LedgerEntryDialog
        open={ledgerDialogOpen}
        onOpenChange={setLedgerDialogOpen}
        mechanicId={selectedMechanicId ?? ''}
        defaultType={ledgerEntryType}
      />

      <DeleteConfirm
        open={deleteConfirmId !== null}
        title="Delete Mechanic"
        description="Are you sure you want to delete this mechanic? This action cannot be undone."
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

const MechanicCard = memo(function MechanicCard({
  mechanic,
  rank,
  stats,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  mechanic: Mechanic;
  rank: number | null;
  stats: MechanicStats;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (m: Mechanic) => void;
  onDelete: (id: string) => void;
}) {
  const handleSelect = useCallback(() => onSelect(mechanic.id), [onSelect, mechanic.id]);
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(mechanic);
    },
    [onEdit, mechanic],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(mechanic.id);
    },
    [onDelete, mechanic.id],
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(mechanic.id);
      }
    },
    [onSelect, mechanic.id],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span
                className={`inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold ${
                  rank === 1
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : rank === 2
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : rank === 3
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-muted text-muted-foreground'
                }`}
                title={`Rank #${rank}`}
              >
                {rank === 1 && <Trophy className="h-3 w-3" />}
                #{rank}
              </span>
            )}
            <p className="truncate font-medium">{mechanic.name}</p>
          </div>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Store className="h-3 w-3" />
            {mechanic.storeName}
          </p>
          {mechanic.phone && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3" />
              {mechanic.phone}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={handleEdit}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span
          className={`text-sm font-semibold ${mechanic.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}
        >
          ₹{Math.abs(mechanic.balance).toLocaleString('en-IN')}
          <span className="text-muted-foreground ml-1 text-xs font-normal">
            {mechanic.balance >= 0 ? 'Dr' : 'Cr'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          {stats.transactions} txns
        </span>
        <span className="inline-flex items-center gap-1">
          <Package className="h-3 w-3" />
          {stats.itemsTaken} items
        </span>
      </div>
    </div>
  );
});

const LedgerRows = memo(function LedgerRows({
  entries,
  rendered,
  currentBalance,
}: {
  entries: MechanicLedgerEntry[];
  rendered: MechanicLedgerEntry[];
  currentBalance: number;
}) {
  const withBalance = (() => {
    const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalEffect = sorted.reduce(
      (sum, e) => sum + (e.type === 'DEBIT' ? e.amount : -e.amount),
      0,
    );
    let running = currentBalance - totalEffect;
    const map = new Map<string, number>();
    for (const e of sorted) {
      running += e.type === 'DEBIT' ? e.amount : -e.amount;
      map.set(e.id, running);
    }
    return map;
  })();

  return (
    <>
      {rendered.map((entry) => {
        const bal = withBalance.get(entry.id) ?? 0;
        return (
          <tr key={entry.id} className="hover:bg-muted/30">
            <td className="text-muted-foreground px-4 py-3">
              {entry.createdAt.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  entry.type === 'DEBIT'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {entry.type === 'DEBIT' ? (
                  <ArrowDownLeft className="h-3 w-3" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                {entry.type}
              </span>
            </td>
            <td className="max-w-xs px-4 py-3">
              <p className="truncate">{entry.description}</p>
              {entry.type === 'DEBIT' && entry.items && entry.items.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.items.map((item) => (
                    <span
                      key={item.productId}
                      className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                    >
                      <Package className="h-3 w-3" />
                      {item.productName} × {item.quantity}
                    </span>
                  ))}
                </div>
              ) : (
                entry.itemCount != null &&
                entry.itemCount > 0 && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({entry.itemCount} items)
                  </span>
                )
              )}
            </td>
            <td
              className={`px-4 py-3 text-right font-medium tabular-nums ${
                entry.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {entry.type === 'DEBIT' ? '+' : '−'}₹{entry.amount.toLocaleString('en-IN')}
            </td>
            <td className="px-4 py-3 text-right font-medium tabular-nums">
              ₹{bal.toLocaleString('en-IN')}
            </td>
            <td className="text-muted-foreground px-4 py-3">{entry.actorId.slice(0, 8)}…</td>
          </tr>
        );
      })}
    </>
  );
});

function LedgerCards({
  entries,
  rendered,
  currentBalance,
}: {
  entries: MechanicLedgerEntry[];
  rendered: MechanicLedgerEntry[];
  currentBalance: number;
}) {
  const withBalance = (() => {
    const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalEffect = sorted.reduce(
      (sum, e) => sum + (e.type === 'DEBIT' ? e.amount : -e.amount),
      0,
    );
    let running = currentBalance - totalEffect;
    const map = new Map<string, number>();
    for (const e of sorted) {
      running += e.type === 'DEBIT' ? e.amount : -e.amount;
      map.set(e.id, running);
    }
    return map;
  })();

  return (
    <>
      {rendered.map((entry) => {
        const bal = withBalance.get(entry.id) ?? 0;
        return (
          <div key={entry.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  entry.type === 'DEBIT'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {entry.type === 'DEBIT' ? (
                  <ArrowDownLeft className="h-3 w-3" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                {entry.type}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  entry.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {entry.type === 'DEBIT' ? '+' : '−'}₹{entry.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-1.5 truncate text-sm">{entry.description}</p>
            {entry.type === 'DEBIT' && entry.items && entry.items.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {entry.items.map((item) => (
                  <span
                    key={item.productId}
                    className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    <Package className="h-3 w-3" />
                    {item.productName} × {item.quantity}
                  </span>
                ))}
              </div>
            )}
            <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
              <span>
                {entry.createdAt.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                {' · '}
                {entry.actorId.slice(0, 8)}…
              </span>
              <span className="font-medium tabular-nums">Bal ₹{bal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function DeleteConfirm({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{description}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
