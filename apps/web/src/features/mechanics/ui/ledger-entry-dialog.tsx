'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicLedgerEntrySchema } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddLedgerEntry } from '../api/use-mechanics';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const ledgerFormSchema = mechanicLedgerEntrySchema.extend({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

type LedgerFormInput = z.infer<typeof ledgerFormSchema>;

interface LedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanicId: string;
  type: 'CREDIT' | 'DEBIT';
}

export function LedgerEntryDialog({ open, onOpenChange, mechanicId, type }: LedgerEntryDialogProps) {
  const addEntry = useAddLedgerEntry();
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LedgerFormInput>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: { mechanicId, type, amount: 0, itemCount: 0, description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ mechanicId, type, amount: 0, itemCount: 0, description: '', fromDate: '', toDate: '' });
    }
  }, [open, mechanicId, type, reset]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const isCredit = type === 'CREDIT';

  const onSubmit = handleSubmit(async (data) => {
    let description = data.description;
    if (isCredit && data.fromDate && data.toDate) {
      const dateRange = `Sales from ${data.fromDate} to ${data.toDate}`;
      description = description ? `${dateRange}: ${description}` : dateRange;
    }
    const result = await addEntry.mutateAsync({
      mechanicId: data.mechanicId,
      type: data.type,
      amount: data.amount,
      itemCount: data.itemCount ?? null,
      description,
    });
    if (!result.success) throw new Error(result.error?.message);
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isCredit ? 'Enter Sales (CREDIT)' : 'Issue Items (DEBIT)'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
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
              <Label htmlFor="amount">
                Total Amount (₹)
              </Label>
              <Input id="amount" type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCount">
                {isCredit ? 'Item Count Sold' : 'Quantity / Item Count'}
              </Label>
              <Input id="itemCount" type="number" min="0" {...register('itemCount', { valueAsNumber: true })} />
              {errors.itemCount && <p className="text-destructive text-sm">{errors.itemCount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
              {errors.description && <p className="text-destructive text-sm">{errors.description.message}</p>}
            </div>
            {addEntry.isError && (
              <p className="text-destructive text-sm">{addEntry.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={addEntry.isPending}>
              {addEntry.isPending
                ? 'Saving…'
                : isCredit
                  ? 'Record Sales'
                  : 'Issue Items'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
