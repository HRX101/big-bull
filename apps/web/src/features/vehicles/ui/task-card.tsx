'use client';

import type { VehicleTask } from '@car-spa/domain';
import {
  VEHICLE_TASK_PAYMENT_STATUS_LABELS,
  formatVehicleTaskServices,
  formatVehicleTaskVehicle,
  getVehicleTaskPaymentDue,
  getVehicleTaskPaymentStatus,
} from '@car-spa/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/shared/badge';
import { cn } from '@/lib/utils';
import { TaskPaymentPanel } from './task-payment-panel';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

const PAYMENT_BADGE_STYLES = {
  unpaid: 'bg-amber-100 text-amber-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-emerald-100 text-emerald-800',
} as const;

interface TaskCardProps {
  task: VehicleTask;
  showPaymentHighlight: boolean;
  paymentTaskId: string | null;
  onOpenPayment: (taskId: string) => void;
  onClosePayment: () => void;
  onEdit: (task: VehicleTask) => void;
  onDelete: (task: VehicleTask) => void;
  isDeleting: boolean;
}

export function TaskCard({
  task,
  showPaymentHighlight,
  paymentTaskId,
  onOpenPayment,
  onClosePayment,
  onEdit,
  onDelete,
  isDeleting,
}: TaskCardProps) {
  const paymentStatus = getVehicleTaskPaymentStatus(task);
  const paymentDue = getVehicleTaskPaymentDue(task);

  return (
    <Card
      className={cn(
        'shadow-sm',
        showPaymentHighlight && 'border-amber-300 ring-1 ring-amber-200',
      )}
    >
      <CardContent className="space-y-3 p-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{task.taskCode}</span>
            <Badge className={PAYMENT_BADGE_STYLES[paymentStatus]}>
              {VEHICLE_TASK_PAYMENT_STATUS_LABELS[paymentStatus]}
            </Badge>
          </div>
          <p className="text-sm font-medium">{formatVehicleTaskVehicle(task)}</p>
          <p className="text-muted-foreground text-xs">{formatVehicleTaskServices(task)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border px-2 py-1.5">
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium">{formatCurrency(task.amount ?? 0)}</p>
          </div>
          <div className="rounded-md border px-2 py-1.5">
            <p className="text-muted-foreground">Advance</p>
            <p className="font-medium">{formatCurrency(task.advancePayment ?? 0)}</p>
          </div>
          <div className="rounded-md border px-2 py-1.5">
            <p className="text-muted-foreground">Due</p>
            <p className="font-medium text-amber-700">{formatCurrency(paymentDue)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={showPaymentHighlight ? 'default' : 'outline'}
            className={cn(
              'h-8 text-xs',
              showPaymentHighlight &&
                'border-amber-400 bg-amber-500 text-white hover:bg-amber-600',
            )}
            onClick={() => onOpenPayment(task.id)}
          >
            Check payment
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onEdit(task)}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            disabled={isDeleting}
            onClick={() => onDelete(task)}
          >
            Delete
          </Button>
        </div>

        {paymentTaskId === task.id && <TaskPaymentPanel task={task} onClose={onClosePayment} />}
      </CardContent>
    </Card>
  );
}
