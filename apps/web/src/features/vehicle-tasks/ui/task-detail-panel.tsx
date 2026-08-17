'use client';

import type { VehicleTask, TaskStatusEvent, Customer, Vehicle, Service } from '@car-spa/domain';
import { useTaskEvents, useRecordTaskPayment } from '../api/use-vehicle-tasks';
import {
  X,
  Clock,
  Car,
  Wrench,
  IndianRupee,
  ArrowRight,
  CheckCircle2,
  Phone,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const STATUS_STYLES: Record<string, { badge: string; dot: string; icon: string }> = {
  RECEIVED: {
    badge: 'bg-blue-500/15 text-blue-200 ring-blue-400/30 dark:bg-blue-400/15 dark:text-blue-300',
    dot: 'bg-blue-400',
    icon: 'bg-blue-500/20 text-blue-300',
  },
  IN_PROGRESS: {
    badge:
      'bg-amber-500/15 text-amber-200 ring-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300',
    dot: 'bg-amber-400',
    icon: 'bg-amber-500/20 text-amber-300',
  },
  READY_FOR_PICKUP: {
    badge:
      'bg-purple-500/15 text-purple-200 ring-purple-400/30 dark:bg-purple-400/15 dark:text-purple-300',
    dot: 'bg-purple-400',
    icon: 'bg-purple-500/20 text-purple-300',
  },
  COMPLETED: {
    badge:
      'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300',
    dot: 'bg-emerald-400',
    icon: 'bg-emerald-500/20 text-emerald-300',
  },
  CANCELLED: {
    badge: 'bg-red-500/15 text-red-200 ring-red-400/30 dark:bg-red-400/15 dark:text-red-300',
    dot: 'bg-red-400',
    icon: 'bg-red-500/20 text-red-300',
  },
};

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
};

function getStatusStyle(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      badge:
        'bg-slate-500/15 text-slate-200 ring-slate-400/30 dark:bg-slate-400/15 dark:text-slate-300',
      dot: 'bg-slate-400',
      icon: 'bg-slate-500/20 text-slate-300',
    }
  );
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

function initials(name: string | null | undefined) {
  return (name ?? 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SectionCard({
  icon,
  iconClass,
  title,
  children,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="bg-card rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function TaskDetailPanel({
  task,
  customer,
  vehicle,
  services,
  open,
  onClose,
}: TaskDetailPanelProps) {
  const { data: events, isLoading: eventsLoading } = useTaskEvents(open ? task.id : null);
  const recordPayment = useRecordTaskPayment();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  if (!open) return null;

  const selectedServices = services.filter((s) => task.serviceIds.includes(s.id));
  const statusStyle = getStatusStyle(task.status);
  const PaymentModeIcon = PAYMENT_ICONS[task.paymentMode] ?? Wallet;
  const paidPercent =
    task.totalAmount > 0 ? Math.round((task.paidAmount / task.totalAmount) * 100) : 0;

  async function handleRecordPayment() {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amount > task.dueAmount) {
      toast.error(
        `Amount cannot exceed the due amount of ₹${task.dueAmount.toLocaleString('en-IN')}`,
      );
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
    <div className="dialog-fade fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="bg-background flex w-full max-w-lg flex-col border-l shadow-2xl">
        <div className="from-navy-light to-navy dark:from-navy-darker dark:to-navy-dark shrink-0 bg-gradient-to-br p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-sky-900/40">
                {initials(customer?.name)}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-widest text-sky-300 uppercase">
                  Task Details
                </p>
                <h2 className="truncate text-lg leading-tight font-semibold">
                  {customer?.name ?? 'Unknown Customer'}
                </h2>
                {customer?.phone && (
                  <p className="flex items-center gap-1 text-sm text-white/60">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close details"
              className="shrink-0 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                statusStyle.badge,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
            <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
              #{task.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard
              icon={Car}
              iconClass="bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400"
              title="Vehicle"
            >
              {vehicle ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide">
                    {vehicle.vehicleNumber}
                  </p>
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
                    {vehicle.type}
                  </span>
                </div>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
            </SectionCard>

            <SectionCard
              icon={Wrench}
              iconClass="bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400"
              title={`Services (${selectedServices.length})`}
            >
              {selectedServices.length > 0 ? (
                <ul className="space-y-2">
                  {selectedServices.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                        {s.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs font-medium">
                        ₹{s.price.toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs">No services selected</p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            icon={IndianRupee}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400"
            title="Payment"
          >
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{paidPercent}% paid</span>
                <span className="text-muted-foreground">
                  ₹{task.paidAmount.toLocaleString('en-IN')} / ₹
                  {task.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    paidPercent >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400',
                  )}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  ₹{task.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ₹{task.paidAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <span className="text-muted-foreground">Due</span>
                <span
                  className={cn(
                    'font-semibold',
                    task.dueAmount > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  ₹{task.dueAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 capitalize dark:text-slate-200">
                  <PaymentModeIcon className="h-3.5 w-3.5 text-slate-400" />
                  {task.paymentMode.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
            </div>

            {task.dueAmount > 0 && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Record Payment
                </p>
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
                    className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400"
                    onClick={handleRecordPayment}
                    disabled={recordingPayment || !paymentAmount}
                  >
                    {recordingPayment ? 'Recording…' : 'Pay'}
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="bg-card rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:bg-slate-400/10 dark:text-slate-300">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Status Timeline
              </h3>
            </div>
            {eventsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-1">
                {events.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-2 text-sm">No events recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: TaskStatusEvent }) {
  const fromLabel = event.fromStatus
    ? (STATUS_LABELS[event.fromStatus] ?? event.fromStatus)
    : 'Created';
  const toLabel = STATUS_LABELS[event.toStatus] ?? event.toStatus;
  const style = getStatusStyle(event.toStatus);

  return (
    <div className="relative pb-4 pl-8 last:pb-0">
      <span
        className="border-border absolute top-0 left-[9px] h-full border-l border-dashed"
        aria-hidden="true"
      />
      <span
        className={cn(
          'ring-background absolute top-0 left-0 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-4',
          style.icon,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      </span>
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {fromLabel}
          <ArrowRight className="mx-1 inline h-3 w-3 text-slate-400" />
          {toLabel}
        </p>
        {event.note && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{event.note}</p>
        )}
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {event.actorId.slice(0, 8)}
          </span>
          <span>•</span>
          <span>{formatDate(event.createdAt)}</span>
          {event.whatsappStatus !== 'NOT_APPLICABLE' && (
            <>
              <span>•</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  event.whatsappStatus === 'SENT'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : event.whatsappStatus === 'FAILED'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {event.whatsappStatus === 'SENT' && <CheckCircle2 className="h-3 w-3" />}
                WhatsApp: {event.whatsappStatus}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
