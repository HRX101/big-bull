'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Search, Plus, Wrench, Edit, Trash2, ArrowUpRight, ArrowDownLeft, Store, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useMechanics, useMechanicLedger, useDeleteMechanic } from '../api/use-mechanics';
import { MechanicDialog } from './mechanic-dialog';
import { LedgerEntryDialog } from './ledger-entry-dialog';
import type { Mechanic, MechanicLedgerEntry } from '@car-spa/domain';

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

  const mechanicsQuery = useMechanics(orgId);
  const ledgerQuery = useMechanicLedger(selectedMechanicId ?? '');
  const deleteMechanic = useDeleteMechanic();

  const mechanics = mechanicsQuery.data ?? [];
  const filtered = mechanics.filter((m) =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const selectedMechanic = mechanics.find((m) => m.id === selectedMechanicId);

  const ledgerEntries = ledgerQuery.data ?? [];

  function openLedgerDialog(type: 'CREDIT' | 'DEBIT') {
    setLedgerEntryType(type);
    setLedgerDialogOpen(true);
  }

  return (
    <div className="flex gap-6">
      <aside className="w-80 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Mechanics</h2>
          <Button size="sm" onClick={() => { setEditingMechanic(null); setDialogOpen(true); }}>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <nav className="space-y-2">
            {filtered.map((mechanic) => (
              <MechanicCard
                key={mechanic.id}
                mechanic={mechanic}
                selected={selectedMechanicId === mechanic.id}
                onSelect={() => setSelectedMechanicId(mechanic.id)}
                onEdit={() => { setEditingMechanic(mechanic); setDialogOpen(true); }}
                onDelete={() => setDeleteConfirmId(mechanic.id)}
              />
            ))}
          </nav>
        )}
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        {!selectedMechanic ? (
          <EmptyState
            title="Select a mechanic"
            description="Choose a mechanic from the sidebar to view their ledger."
          />
        ) : ledgerQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                    <Wrench className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedMechanic.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
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
                  <p className={`text-2xl font-bold ${selectedMechanic.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.abs(selectedMechanic.balance).toLocaleString('en-IN')}
                    <span className="ml-1 text-sm font-normal">
                      {selectedMechanic.balance >= 0 ? '(Dr)' : '(Cr)'}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={() => openLedgerDialog('CREDIT')}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Enter Sales
              </Button>
              <Button variant="outline" onClick={() => openLedgerDialog('DEBIT')}>
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Issue Items
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
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
                <tbody className="divide-y divide-border">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No ledger entries yet.
                      </td>
                    </tr>
                  ) : (
                    <LedgerRows entries={ledgerEntries} currentBalance={selectedMechanic.balance} />
                  )}
                </tbody>
              </table>
            </div>
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
        type={ledgerEntryType}
      />

      <DeleteConfirm
        open={deleteConfirmId !== null}
        title="Delete Mechanic"
        description="Are you sure you want to delete this mechanic? This action cannot be undone."
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteMechanic.mutate(deleteConfirmId);
            if (selectedMechanicId === deleteConfirmId) setSelectedMechanicId(null);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
}

function MechanicCard({
  mechanic,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  mechanic: Mechanic;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{mechanic.name}</p>
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
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className={`mt-2 text-sm font-semibold ${mechanic.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
        ₹{Math.abs(mechanic.balance).toLocaleString('en-IN')}
        <span className="text-muted-foreground ml-1 text-xs font-normal">
          {mechanic.balance >= 0 ? 'Dr' : 'Cr'}
        </span>
      </div>
    </div>
  );
}

function LedgerRows({ entries, currentBalance }: { entries: MechanicLedgerEntry[]; currentBalance: number }) {
  const withBalance = (() => {
    const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const totalEffect = sorted.reduce((sum, e) => sum + (e.type === 'DEBIT' ? e.amount : -e.amount), 0);
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
      {entries.map((entry) => {
        const bal = withBalance.get(entry.id) ?? 0;
        return (
          <tr key={entry.id} className="hover:bg-muted/30">
            <td className="px-4 py-3 text-muted-foreground">
              {entry.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
            <td className="max-w-xs truncate px-4 py-3">
              {entry.description}
              {entry.itemCount != null && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({entry.itemCount} items)
                </span>
              )}
            </td>
            <td className={`px-4 py-3 text-right font-medium tabular-nums ${
              entry.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
            }`}>
              {entry.type === 'DEBIT' ? '+' : '−'}₹{entry.amount.toLocaleString('en-IN')}
            </td>
            <td className="px-4 py-3 text-right font-medium tabular-nums">
              ₹{bal.toLocaleString('en-IN')}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {entry.actorId.slice(0, 8)}…
            </td>
          </tr>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
