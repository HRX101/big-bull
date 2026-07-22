'use client';

import type { VehicleTask } from '@car-spa/domain';
import {
  PAYMENT_METHOD_LABELS,
  VEHICLE_TASK_PAYMENT_STATUS_LABELS,
  getVehicleTaskPaymentDue,
  getVehicleTaskPaymentStatus,
} from '@car-spa/domain';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { useUpdateVehicleTaskPayment } from '@/hooks/use-operations';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

interface TaskPaymentPanelProps {
  task: VehicleTask;
  onClose: () => void;
}

export function TaskPaymentPanel({ task, onClose }: TaskPaymentPanelProps) {
  const updatePayment = useUpdateVehicleTaskPayment();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      paymentMethod: task.paymentMethod ?? 'cash',
      amount: task.amount ?? 0,
      advancePayment: task.advancePayment ?? 0,
    },
  });

  useEffect(() => {
    reset({
      paymentMethod: task.paymentMethod ?? 'cash',
      amount: task.amount ?? 0,
      advancePayment: task.advancePayment ?? 0,
    });
  }, [task, reset]);

  const amount = watch('amount');
  const advancePayment = watch('advancePayment');
  const paymentDue = Math.max(0, (Number(amount) || 0) - (Number(advancePayment) || 0));
  const paymentStatus = getVehicleTaskPaymentStatus({
    amount: Number(amount) || 0,
    advancePayment: Number(advancePayment) || 0,
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await updatePayment.mutateAsync({
      taskId: task.id,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      advancePayment: data.advancePayment,
    });
    if (!result.success) {
      window.alert(result.error?.message ?? 'Failed to update payment.');
      return;
    }
    onClose();
  });

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Check payment · {task.taskCode}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Review totals, advance received, and balance due before pickup.
            </p>
          </div>
          <Badge>{VEHICLE_TASK_PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-background rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Total amount</p>
              <p className="mt-1 font-semibold">{formatCurrency(Number(amount) || 0)}</p>
            </div>
            <div className="bg-background rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Advance payment</p>
              <p className="mt-1 font-semibold">{formatCurrency(Number(advancePayment) || 0)}</p>
            </div>
            <div className="bg-background rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Payment due</p>
              <p className="mt-1 font-semibold text-amber-700">{formatCurrency(paymentDue)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`amount-${task.id}`}>Total amount</Label>
              <Input
                id={`amount-${task.id}`}
                type="number"
                min="0"
                step="0.01"
                className="h-9"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`advance-${task.id}`}>Advance payment</Label>
              <Input
                id={`advance-${task.id}`}
                type="number"
                min="0"
                step="0.01"
                className="h-9"
                {...register('advancePayment', { valueAsNumber: true })}
              />
              {errors.advancePayment && (
                <p className="text-destructive text-xs">{errors.advancePayment.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Payment due</Label>
              <Input
                readOnly
                className="bg-muted h-9"
                value={formatCurrency(
                  getVehicleTaskPaymentDue({
                    amount: Number(amount) || 0,
                    advancePayment: Number(advancePayment) || 0,
                  }),
                )}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`payment-method-${task.id}`}>Payment mode</Label>
            <select
              id={`payment-method-${task.id}`}
              className="border-input bg-input h-9 w-full rounded-md border px-3 text-sm sm:max-w-xs"
              {...register('paymentMethod')}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={updatePayment.isPending}>
              Save payment
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
