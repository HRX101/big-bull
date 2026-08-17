'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Hash, Search, X, PackageCheck } from 'lucide-react';
import type { Product, SerializedItem } from '@car-spa/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SerialSelectDialogProps {
  product: Product | null;
  available: SerializedItem[];
  existingCount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: (selected: SerializedItem[]) => void;
}

export function SerialSelectDialog({
  product,
  available,
  existingCount,
  open,
  onClose,
  onConfirm,
}: SerialSelectDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return available;
    const lower = query.toLowerCase();
    return available.filter((s) => s.serialNumber.toLowerCase().includes(lower));
  }, [available, query]);

  function toggle(serialNumber: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serialNumber)) next.delete(serialNumber);
      else next.add(serialNumber);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = filtered.length > 0 && filtered.every((s) => next.has(s.serialNumber));
      for (const s of filtered) {
        if (allSelected) next.delete(s.serialNumber);
        else next.add(s.serialNumber);
      }
      return next;
    });
  }

  if (!open) return null;
  if (!product) return null;

  const selectedItems = available.filter((s) => selected.has(s.serialNumber));
  const selectAllActive =
    filtered.length > 0 && filtered.every((s) => selected.has(s.serialNumber));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="serial-select-title"
    >
      <div
        className="dialog-pop bg-card flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="from-navy-light to-navy bg-gradient-to-br px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-900/30">
                <Hash className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-widest text-sky-300 uppercase">
                  Serialized Product
                </p>
                <h2 id="serial-select-title" className="truncate text-lg font-semibold">
                  {product.name}
                </h2>
                <p className="text-sm text-white/60">
                  {product.sku} · {available.length} available
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Available
              </p>
              <p className="text-lg font-semibold">{available.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                In Cart
              </p>
              <p className="text-lg font-semibold">{existingCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-400/15 px-3 py-2.5 ring-1 ring-emerald-400/30">
              <p className="text-[10px] font-semibold tracking-wider text-emerald-200/70 uppercase">
                Selected
              </p>
              <p className="text-lg font-semibold text-emerald-300">{selected.size}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search serial numbers…"
              className="h-9 pl-9"
            />
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-primary flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-blue-500/20"
          >
            <Check className="h-3.5 w-3.5" />
            {selectAllActive ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-sm">
              <PackageCheck className="h-8 w-8 opacity-40" />
              <p>{available.length === 0 ? 'No serial numbers in stock' : 'No matches found'}</p>
            </div>
          ) : (
            filtered.map((serial) => {
              const isSelected = selected.has(serial.serialNumber);
              return (
                <button
                  key={serial.id}
                  type="button"
                  onClick={() => toggle(serial.serialNumber)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-150 active:scale-[0.98]',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/10 dark:bg-blue-500/10'
                      : 'border-border hover:bg-muted/40 hover:border-blue-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-border bg-background text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="font-mono text-xs font-medium">{serial.serialNumber}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="bg-muted/40 flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedItems)}
            disabled={selected.size === 0}
            className="gap-1.5 shadow-md shadow-blue-900/20"
          >
            <PackageCheck className="h-4 w-4" />
            Add {selected.size} to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
