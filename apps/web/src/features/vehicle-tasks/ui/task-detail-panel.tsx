'use client';

import type { VehicleTask, TaskStatusEvent, Customer, Vehicle, Service } from '@car-spa/domain';
import { useTaskEvents, useRecordTaskPayment } from '../api/use-vehicle-tasks';
import { X, Clock, User, Car, Wrench, IndianRupee, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';

interface TaskDetailPanelProps {
  task: VehicleTask;
  customer: Customer | null;
  vehicle: Vehicle | null | undefined;
  services: Service[];
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function getStatusColor(status: string) {
  switch (status) {
    case 'RECEIVED': return 'bg-blue-100 text-blue-700';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700';
    case 'READY_FOR_PICKUP': return 'bg-purple-100 text-purple-700';
    case 'COMPLETED': return 'bg-green-100 text-green-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function EventIcon({ status }: { status: string | null }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  return <Clock className="text-muted-foreground h-4 w-4" />;
}

export function TaskDetailPanel({ task, customer, vehicle, services, open, onClose }: TaskDetailPanelProps) {
  const { data: events, isLoading: eventsLoading } = useTaskEvents(open ? task.id : null);
  const recordPayment = useRecordTaskPayment();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  if (!open) return null;

  const selectedServices = services.filter((s) => task.serviceIds.includes(s.id));

  async function handleRecordPayment() {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amount > task.dueAmount) {
      toast.error(`Amount cannot exceed the due amount of ₹${task.dueAmount.toLocaleString('en-IN')}`);
      return;
    }
    setRecordingPayment(true);
    try {
      const result = await recordPayment.mutateAsync({ taskId: task.id, amount });
      if (result.success) {
        toast.success('Payment recorded');
        setPaymentAmount('');
      } else {
        toast.error(result.error.message);
      }
    } finally {
      setRecordingPayment(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="bg-background flex w-full max-w-md flex-col overflow-y-auto border-l shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 p-4">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}>
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
            <span className="text-muted-foreground text-xs">
              #{task.id.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <User className="text-muted-foreground h-4 w-4" />
              Customer
            </h3>
            {customer ? (
              <div className="text-muted-foreground ml-6 text-sm">
                <p className="font-medium text-foreground">{customer.name}</p>
                <p>{customer.phone}</p>
              </div>
            ) : (
              <Skeleton className="ml-6 h-10 w-40" />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Car className="text-muted-foreground h-4 w-4" />
              Vehicle
            </h3>
            {vehicle ? (
              <div className="text-muted-foreground ml-6 text-sm">
                <p className="font-medium text-foreground">{vehicle.brand} {vehicle.model}</p>
                <p>{vehicle.vehicleNumber}</p>
                <p className="capitalize">{vehicle.type}</p>
              </div>
            ) : (
              <Skeleton className="ml-6 h-10 w-40" />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="text-muted-foreground h-4 w-4" />
              Services ({selectedServices.length})
            </h3>
            <div className="ml-6 space-y-1.5">
              {selectedServices.map((s) => (
                <div key={s.id} className="text-sm">
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <IndianRupee className="text-muted-foreground h-4 w-4" />
              Payment
            </h3>
            <div className="ml-6 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">₹{task.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>₹{task.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium text-amber-600">₹{task.dueAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span>{task.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={task.paymentStatus === 'FULL' ? 'text-green-600' : task.paymentStatus === 'PARTIAL' ? 'text-amber-600' : 'text-muted-foreground'}>
                  {task.paymentStatus}
                </span>
              </div>
            </div>
            {task.dueAmount > 0 && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <div className="ml-6 space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Record Payment</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={task.dueAmount}
                    placeholder={`Up to ₹${task.dueAmount.toLocaleString('en-IN')}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={handleRecordPayment}
                    disabled={recordingPayment || !paymentAmount}
                  >
                    {recordingPayment ? 'Recording…' : 'Pay'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Clock className="text-muted-foreground h-4 w-4" />
              Status Timeline
            </h3>
            {eventsLoading ? (
              <div className="ml-6 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : events && events.length > 0 ? (
              <div className="ml-6 space-y-3">
                {events.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground ml-6 text-sm">No events recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: TaskStatusEvent }) {
  const fromLabel = event.fromStatus ? STATUS_LABELS[event.fromStatus] ?? event.fromStatus : 'Created';
  const toLabel = STATUS_LABELS[event.toStatus] ?? event.toStatus;

  return (
    <div className="border-border relative border-l-2 pl-4 pb-3">
      <div className="absolute -left-[9px] top-0 bg-background p-0.5">
        <EventIcon status={event.toStatus} />
      </div>
      <p className="text-xs font-medium">
        {fromLabel} <ArrowRight className="inline h-3 w-3" /> {toLabel}
      </p>
      <p className="text-muted-foreground text-xs">{event.note}</p>
      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
        <span>{event.actorId.slice(0, 8)}</span>
        <span>•</span>
        <span>{formatDate(event.createdAt)}</span>
        {event.whatsappStatus !== 'NOT_APPLICABLE' && (
          <>
            <span>•</span>
            <span className={event.whatsappStatus === 'SENT' ? 'text-green-600' : event.whatsappStatus === 'FAILED' ? 'text-red-600' : ''}>
              WhatsApp: {event.whatsappStatus}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
