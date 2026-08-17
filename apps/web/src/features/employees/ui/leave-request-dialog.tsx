'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { leaveRequestSchema } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLeaveRequest } from '../api/use-employees';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LeaveRequestDialog({ open, onOpenChange, onSuccess }: LeaveRequestDialogProps) {
  const createLeaveRequest = useCreateLeaveRequest();
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { fromDate: '', toDate: '', reason: '', leaveType: 'UNPAID' as const },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createLeaveRequest.mutateAsync(data);
    if (!result.success) throw new Error(result.error?.message);
    onSuccess?.();
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Request Leave</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leave-from">From Date</Label>
                <Input id="leave-from" type="date" {...register('fromDate')} />
                {errors.fromDate && (
                  <p className="text-destructive text-sm">{errors.fromDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-to">To Date</Label>
                <Input id="leave-to" type="date" {...register('toDate')} />
                {errors.toDate && (
                  <p className="text-destructive text-sm">{errors.toDate.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave Type</Label>
              <select
                id="leave-type"
                className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register('leaveType')}
              >
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="SICK">Sick</option>
              </select>
              {errors.leaveType && (
                <p className="text-destructive text-sm">{errors.leaveType.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-reason">Reason</Label>
              <textarea
                id="leave-reason"
                rows={3}
                className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register('reason')}
              />
              {errors.reason && <p className="text-destructive text-sm">{errors.reason.message}</p>}
            </div>
            {createLeaveRequest.isError && (
              <p className="text-destructive text-sm">{createLeaveRequest.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={createLeaveRequest.isPending}>
              {createLeaveRequest.isPending ? 'Submitting…' : 'Submit Leave Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
