'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { taskStatusChangeSchema, type VehicleTask } from '@car-spa/domain';
import { type TaskStatus } from '@car-spa/shared';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useChangeTaskStatus } from '../api/use-vehicle-tasks';
import { useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface StatusChangeDialogProps {
  task: VehicleTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_FLOW: Record<TaskStatus, TaskStatus[]> = {
  RECEIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function StatusChangeDialog({ task, open, onOpenChange, onSuccess }: StatusChangeDialogProps) {
  const changeStatus = useChangeTaskStatus();
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskStatusChangeSchema),
    defaultValues: {
      taskId: task.id,
      toStatus: STATUS_FLOW[task.status][0] ?? task.status,
      note: '',
    },
  });

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const nextStatuses = STATUS_FLOW[task.status];
  const selectedStatus = watch('toStatus');

  const blockedByPayment =
    selectedStatus === 'COMPLETED' && task.dueAmount > 0;

  const onSubmit = handleSubmit(async (data) => {
    const result = await changeStatus.mutateAsync(data);
    if (result.success) {
      onSuccess?.();
      onOpenChange(false);
    }
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Change Task Status</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-muted rounded-md px-2 py-1 font-medium">{task.status}</span>
              <ArrowRight className="text-muted-foreground h-4 w-4" />
              <span className="bg-primary/10 text-primary rounded-md px-2 py-1 font-medium">{selectedStatus}</span>
            </div>

            {nextStatuses.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="toStatus">Move to</Label>
                <select
                  id="toStatus"
                  className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  {...register('toStatus')}
                >
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No further status changes available.</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Note (mandatory)</Label>
              <textarea
                id="note"
                className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                placeholder="Describe the reason for this status change..."
                {...register('note')}
              />
              {errors.note && <p className="text-destructive text-sm">{errors.note.message as string}</p>}
            </div>

            {blockedByPayment && (
              <p className="text-destructive bg-destructive/5 rounded-md p-3 text-sm">
                Outstanding payment of ₹{task.dueAmount.toLocaleString('en-IN')} must be cleared
                before the task can be completed. Record the payment on the task first.
              </p>
            )}

            {changeStatus.isError && (
              <p className="text-destructive text-sm">{changeStatus.error.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={changeStatus.isPending || nextStatuses.length === 0 || blockedByPayment}>
              {changeStatus.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
