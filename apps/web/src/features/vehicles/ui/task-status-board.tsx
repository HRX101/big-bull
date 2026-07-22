'use client';

import type { VehicleTask, VehicleTaskStatus } from '@car-spa/domain';
import {
  VEHICLE_TASK_STATUSES,
  VEHICLE_TASK_STATUS_LABELS,
  getNextVehicleTaskStatuses,
  getVehicleTaskPaymentStatus,
} from '@car-spa/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';

const COLUMN_STYLES: Record<VehicleTaskStatus, string> = {
  todo: 'border-slate-200 bg-slate-50/50',
  in_progress: 'border-blue-200 bg-blue-50/40',
  ready_for_pickup: 'border-emerald-200 bg-emerald-50/40',
};

const COLUMN_HEADER_STYLES: Record<VehicleTaskStatus, string> = {
  todo: 'text-slate-700',
  in_progress: 'text-blue-800',
  ready_for_pickup: 'text-emerald-800',
};

interface TaskStatusColumnProps {
  status: VehicleTaskStatus;
  tasks: VehicleTask[];
  paymentTaskId: string | null;
  onOpenPayment: (taskId: string) => void;
  onClosePayment: () => void;
  onEdit: (task: VehicleTask) => void;
  onDelete: (task: VehicleTask) => void;
  onTransition: (taskId: string, toStatus: VehicleTaskStatus) => void;
  isDeleting: boolean;
}

function TaskStatusColumn({
  status,
  tasks,
  paymentTaskId,
  onOpenPayment,
  onClosePayment,
  onEdit,
  onDelete,
  onTransition,
  isDeleting,
}: TaskStatusColumnProps) {
  return (
    <section
      className={cn('flex min-h-[280px] flex-col rounded-lg border p-3', COLUMN_STYLES[status])}
      aria-label={VEHICLE_TASK_STATUS_LABELS[status]}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className={cn('text-sm font-semibold', COLUMN_HEADER_STYLES[status])}>
          {VEHICLE_TASK_STATUS_LABELS[status]}
        </h3>
        <span className="bg-background text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
          {tasks.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground m-auto py-8 text-center text-xs">No tasks</p>
        ) : (
          tasks.map((task) => {
            const nextStatuses = getNextVehicleTaskStatuses(task.status);
            const paymentStatus = getVehicleTaskPaymentStatus(task);
            const showPaymentHighlight =
              task.status === 'ready_for_pickup' && paymentStatus !== 'paid';

            return (
              <div key={task.id} className="space-y-2">
                <TaskCard
                  task={task}
                  showPaymentHighlight={showPaymentHighlight}
                  paymentTaskId={paymentTaskId}
                  onOpenPayment={onOpenPayment}
                  onClosePayment={onClosePayment}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                />
                {nextStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {nextStatuses.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground h-7 px-2 text-xs"
                        onClick={() => onTransition(task.id, nextStatus)}
                      >
                        Move to {VEHICLE_TASK_STATUS_LABELS[nextStatus]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

interface TaskStatusBoardProps {
  tasks: VehicleTask[];
  emptyMessage?: string;
  paymentTaskId: string | null;
  onOpenPayment: (taskId: string) => void;
  onClosePayment: () => void;
  onEdit: (task: VehicleTask) => void;
  onDelete: (task: VehicleTask) => void;
  onTransition: (taskId: string, toStatus: VehicleTaskStatus) => void;
  isDeleting: boolean;
}

export function TaskStatusBoard({
  tasks,
  emptyMessage = 'No tasks yet.',
  paymentTaskId,
  onOpenPayment,
  onClosePayment,
  onEdit,
  onDelete,
  onTransition,
  isDeleting,
}: TaskStatusBoardProps) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
      {VEHICLE_TASK_STATUSES.map((status) => (
        <div key={status} className="w-[min(100%,320px)] shrink-0 lg:w-auto lg:shrink">
          <TaskStatusColumn
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            paymentTaskId={paymentTaskId}
            onOpenPayment={onOpenPayment}
            onClosePayment={onClosePayment}
            onEdit={onEdit}
            onDelete={onDelete}
            onTransition={onTransition}
            isDeleting={isDeleting}
          />
        </div>
      ))}
    </div>
  );
}
