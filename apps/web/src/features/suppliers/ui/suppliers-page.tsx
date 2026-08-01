'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Plus,
  X,
  Edit,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { Supplier } from '@car-spa/domain';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useArchiveSupplier,
  useHardDeleteSupplier,
  useSupplierByPhone,
} from '@/features/inventory/api/use-inventory';

function timeAgo(d: Date) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24); if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product suppliers</p>
        </div>
        <CreateSupplierDialog />
      </div>

      <div className="mt-6">
        <SuppliersView
          suppliers={suppliers}
          isLoading={suppliersQ.isLoading}
          error={suppliersQ.error}
          onRefetch={() => suppliersQ.refetch()}
        />
      </div>
    </motion.div>
  );
}

function SuppliersView({ suppliers, isLoading, error, onRefetch }: { suppliers: Supplier[]; isLoading: boolean; error: Error | null; onRefetch: () => void }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const total = suppliers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = suppliers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-4 w-24" /></CardContent></Card>)}
  </div>;

  if (error) return <div className="flex flex-col items-center gap-3 py-16"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-muted-foreground">Failed to load suppliers.</p><Button variant="outline" size="sm" onClick={onRefetch}>Retry</Button></div>;

  if (suppliers.length === 0) return <EmptyState title="No suppliers yet" description="Add suppliers to track who provides your products." action={<CreateSupplierDialog />} />;

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{total} supplier{total === 1 ? '' : 's'}</p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {paginated.map(s => <SupplierCard key={s.id} supplier={s} />)}
    </div>
    {totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-sm text-muted-foreground">{safePage} / {totalPages}</span>
      <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
    </div>}
  </div>;
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.contactPhone ?? '');
  const [notes, setNotes] = useState(supplier.notes ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'archive' | 'delete'>('archive');
  const archiveSup = useArchiveSupplier();
  const deleteSup = useHardDeleteSupplier();
  const updateSup = useUpdateSupplier();

  const handleSave = () => {
    updateSup.mutateAsync({ id: supplier.id, data: { name: name.trim(), contactPhone: phone || null, notes: notes || null } });
    setEditing(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-2">
            <Truck className="text-muted-foreground h-4 w-4" />
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              {supplier.contactPhone && <p className="text-sm text-muted-foreground">{supplier.contactPhone}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(!editing)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted" aria-label="Edit supplier"><Edit className="h-4 w-4" /></button>
            <button onClick={() => { setConfirmType('archive'); setConfirmOpen(true); }} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted" aria-label="Archive supplier"><Archive className="h-4 w-4" /></button>
            <button onClick={() => { setConfirmType('delete'); setConfirmOpen(true); }} className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10" aria-label="Delete supplier"><Trash2 className="h-4 w-4" /></button>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {editing ? (
            <div className="space-y-3">
              <div><Label htmlFor="sup-name">Name</Label><Input id="sup-name" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label htmlFor="sup-phone">Phone</Label><Input id="sup-phone" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div><Label htmlFor="sup-notes">Notes</Label><Input id="sup-notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <div className="flex gap-2"><Button size="sm" onClick={handleSave} disabled={updateSup.isPending}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
            </div>
          ) : (
            <>
              {supplier.notes && <p className="text-muted-foreground">{supplier.notes}</p>}
              <p className="text-xs text-muted-foreground mt-2">Added {timeAgo(supplier.createdAt)}</p>
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => { if (confirmType === 'archive') await archiveSup.mutateAsync(supplier.id); else await deleteSup.mutateAsync(supplier.id); }}
        title={confirmType === 'archive' ? 'Archive Supplier' : 'Delete Supplier'}
        description={confirmType === 'archive' ? `Archive "${supplier.name}"? It will be hidden from product forms.` : `Permanently delete "${supplier.name}"? Only possible if no stock movements reference this supplier.`}
        variant={confirmType === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmType === 'archive' ? 'Archive' : 'Delete'}
        loading={archiveSup.isPending || deleteSup.isPending}
      />
    </>
  );
}

function CreateSupplierDialog() {
  const createSupplier = useCreateSupplier();
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  const existingQ = useSupplierByPhone(orgId, phone);

  useEffect(() => {
    if (!open) return;
    const existing = existingQ.data;
    if (existing && !name.trim()) {
      setName(existing.name);
    }
  }, [existingQ.data, open, name]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    const result = await createSupplier.mutateAsync({
      name: name.trim(), contactPhone: phone || undefined, notes: notes || undefined,
    });
    if (!result.success) return;
    setOpen(false); setName(''); setPhone(''); setNotes(''); setDirty(false);
  };

  const handleClose = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    setOpen(false);
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="create-sup-title">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="create-sup-title" className="text-lg font-semibold">Add Supplier</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Supplier Name" required tooltip="Display name for this supplier" id="sup-create-name">
            <Input id="sup-create-name" value={name} onChange={e => { setName(e.target.value); setDirty(true); }} placeholder="Supplier name" />
          </Field>
          <Field label="Contact Phone" tooltip="Supplier's phone number for reference" id="sup-create-phone">
            <Input id="sup-create-phone" value={phone} onChange={e => { setPhone(e.target.value); setDirty(true); }} placeholder="Contact number" />
            {existingQ.isFetching && phone.trim().length >= 10 && (
              <p className="text-muted-foreground text-xs">Looking up phone number…</p>
            )}
            {existingQ.data && (
              <p className="bg-muted text-muted-foreground rounded-md px-2.5 py-1.5 text-xs">
                Existing supplier found — name filled automatically.
              </p>
            )}
          </Field>
          <Field label="Notes" id="sup-create-notes">
            <Input id="sup-create-notes" value={notes} onChange={e => { setNotes(e.target.value); setDirty(true); }} placeholder="Notes about this supplier" />
          </Field>
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || createSupplier.isPending}>
            {createSupplier.isPending ? 'Creating...' : 'Add Supplier'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, tooltip, children, id }: { label: string; required?: boolean; tooltip?: string; children: React.ReactNode; id: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span
            className="text-destructive font-bold text-sm cursor-help relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            tabIndex={0}
            role="note"
            aria-label={tooltip ? `Required: ${tooltip}` : 'Required field'}
          >
            *
            {showTooltip && tooltip && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg border whitespace-nowrap z-50" role="tooltip">
                {tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </span>
            )}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
