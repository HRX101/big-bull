'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PAYMENT_MODES, type TaskStatus } from '@car-spa/shared';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  IndianRupee,
  Wallet,
  X,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Banknote,
  Inbox,
  CarFront,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination';
import { cn } from '@/lib/utils';
import {
  useVehicleTasks,
  useCustomers,
  useServices,
  useVehiclesByOrg,
  useChangeTaskStatus,
  useRecordTaskPayment,
  useVehicle,
} from '../api/use-vehicle-tasks';
import { TaskWizardDialog } from './task-wizard-dialog';
import { StatusChangeDialog } from './status-change-dialog';
import { TaskDetailPanel } from './task-detail-panel';
import { ReceiptModal } from '@/features/pos/ui/receipt-modal';
import { useCreateSale } from '@/features/pos/api/use-pos';
import type { VehicleTask, Customer, Service, Vehicle, POSSale } from '@car-spa/domain';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_BG: Record<string, string> = {
  RECEIVED:
    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-500/30',
  IN_PROGRESS:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-500/30',
  READY_FOR_PICKUP:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  COMPLETED:
    'bg-green-50 text-green-700 ring-green-200 dark:bg-green-400/10 dark:text-green-300 dark:ring-green-500/30',
  CANCELLED:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-500/30',
};

const ACTIVE_COLUMNS: {
  key: TaskStatus;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  badge: string;
  bar: string;
  dot: string;
  dashedIcon: string;
}[] = [
  {
    key: 'RECEIVED',
    label: 'Received',
    subtitle: 'Awaiting work',
    icon: Inbox,
    accent:
      'bg-blue-500/10 text-blue-600 shadow-sm shadow-blue-500/20 dark:bg-blue-400/15 dark:text-blue-400',
    badge: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:bg-blue-400/15 dark:text-blue-400',
    bar: 'from-blue-500 to-sky-400',
    dot: 'bg-blue-500',
    dashedIcon: 'bg-blue-500/10 text-blue-500',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    subtitle: 'In workshop',
    icon: Wrench,
    accent:
      'bg-amber-500/10 text-amber-600 shadow-sm shadow-amber-500/20 dark:bg-amber-400/15 dark:text-amber-400',
    badge:
      'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:bg-amber-400/15 dark:text-amber-400',
    bar: 'from-amber-500 to-orange-400',
    dot: 'bg-amber-500',
    dashedIcon: 'bg-amber-500/10 text-amber-500',
  },
  {
    key: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    subtitle: 'Handover pending',
    icon: CarFront,
    accent:
      'bg-emerald-500/10 text-emerald-600 shadow-sm shadow-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-400',
    badge:
      'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-400',
    bar: 'from-emerald-500 to-teal-400',
    dot: 'bg-emerald-500',
    dashedIcon: 'bg-emerald-500/10 text-emerald-500',
  },
];

const MOVE_NOTES: Record<string, string> = {
  IN_PROGRESS: 'Moved to In Progress from board',
  READY_FOR_PICKUP: 'Marked ready for pickup',
  RECEIVED: 'Moved back to Received from board',
};

const LIST_PAGE_SIZE = 5;
const BOARD_PAGE_SIZE = 5;

function initials(name: string | null | undefined) {
  return (name ?? 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function VehicleTasksPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';

  const [view, setView] = useState<'board' | 'list'>('board');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<VehicleTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusChangeTask, setStatusChangeTask] = useState<VehicleTask | null>(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [completedSale, setCompletedSale] = useState<{
    sale: POSSale;
    customerName?: string | null;
  } | null>(null);
  const [collectPaymentTask, setCollectPaymentTask] = useState<VehicleTask | null>(null);

  const tasksQuery = useVehicleTasks(orgId);
  const customersQuery = useCustomers(orgId);
  const servicesQuery = useServices(orgId);
  const vehiclesQuery = useVehiclesByOrg(orgId);
  const changeStatus = useChangeTaskStatus();
  const recordTaskPayment = useRecordTaskPayment();
  const createSale = useCreateSale();

  const allTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const tasks = useMemo(() => {
    if (!searchQuery.trim()) return allTasks;
    const lower = searchQuery.toLowerCase();
    return allTasks.filter((task) => {
      const customer = customerById.get(task.customerId);
      return customer?.name.toLowerCase().includes(lower) || customer?.phone.includes(lower);
    });
  }, [allTasks, searchQuery, customerById]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => ACTIVE_COLUMNS.some((col) => col.key === t.status)),
    [tasks],
  );

  const groupedActive = useMemo(() => {
    const groups: Record<string, VehicleTask[]> = {};
    for (const col of ACTIVE_COLUMNS) {
      groups[col.key] = activeTasks.filter((t) => t.status === col.key);
    }
    return groups;
  }, [activeTasks]);

  const { data: selectedVehicle } = useVehicle(selectedTask?.vehicleId ?? null);

  function getCustomer(task: VehicleTask): Customer | null {
    return customerById.get(task.customerId) ?? null;
  }

  function getVehicle(task: VehicleTask): Vehicle | null {
    return vehicleById.get(task.vehicleId) ?? null;
  }

  function handleTaskClick(task: VehicleTask) {
    setSelectedTask(task);
    setDetailOpen(true);
  }

  function handleStatusChange(task: VehicleTask) {
    setStatusChangeTask(task);
    setStatusChangeOpen(true);
  }

  function handleStatusChangeSuccess() {
    setStatusChangeOpen(false);
    setStatusChangeTask(null);
  }

  async function handleQuickMove(task: VehicleTask, toStatus: TaskStatus) {
    const result = await changeStatus.mutateAsync({
      taskId: task.id,
      toStatus,
      note: MOVE_NOTES[toStatus] ?? 'Status changed from board',
    });
    if (result.success) toast.success(STATUS_LABELS[toStatus] ?? 'Status updated');
  }

  function handleComplete(task: VehicleTask) {
    if (completingId) return;
    if (task.dueAmount > 0) {
      setCollectPaymentTask(task);
      return;
    }
    setCompletingId(task.id);
    void runCompletion(task).finally(() => setCompletingId(null));
  }

  async function runCompletion(task: VehicleTask): Promise<boolean> {
    try {
      const taskServices = services.filter((s) => task.serviceIds.includes(s.id));
      let items: { itemId: string; itemName: string; quantity: number; unitPrice: number }[];
      if (taskServices.length > 0) {
        const count = taskServices.length;
        const base = Math.round((task.totalAmount / count) * 100) / 100;
        items = taskServices.map((s, i) => ({
          itemId: '',
          itemName: s.name,
          quantity: 1,
          unitPrice:
            i === count - 1
              ? Math.round((task.totalAmount - base * (count - 1)) * 100) / 100
              : base,
        }));
      } else {
        items = [{ itemId: '', itemName: 'Service', quantity: 1, unitPrice: task.totalAmount }];
      }

      const [statusResult, saleResult] = await Promise.all([
        changeStatus.mutateAsync({
          taskId: task.id,
          toStatus: 'COMPLETED',
          note: 'Task completed and receipt generated',
        }),
        createSale.mutateAsync({
          customerId: task.customerId,
          items,
          paymentMode: task.paymentMode,
        }),
      ]);

      if (!statusResult.success) {
        toast.error(statusResult.error.message);
        return false;
      }
      if (!saleResult.success) {
        toast.error(saleResult.error.message);
        return false;
      }

      const customer = customerById.get(task.customerId);
      setCompletedSale({ sale: saleResult.value, customerName: customer?.name });
      toast.success('Task completed', {
        description: `${customer?.name ?? 'Customer'} · ${task.totalAmount.toLocaleString('en-IN')} received`,
      });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task');
      return false;
    }
  }

  async function handleCollectAndComplete(amount: number) {
    if (!collectPaymentTask || completingId) return;
    setCompletingId(collectPaymentTask.id);
    try {
      const [paymentResult] = await Promise.all([
        recordTaskPayment.mutateAsync({
          taskId: collectPaymentTask.id,
          amount,
        }),
        runCompletion(collectPaymentTask),
      ]);
      if (!paymentResult.success) {
        toast.error(paymentResult.error.message);
        return;
      }
      setCollectPaymentTask(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to collect payment');
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Workshop"
        title="Vehicle Tasks"
        description="Manage service tasks on the board."
        icon={view === 'board' ? undefined : Wrench}
        action={
          <Button
            onClick={() => setWizardOpen(true)}
            className="h-10 gap-1.5 px-5 shadow-md shadow-blue-900/20"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by customer name or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="bg-muted/60 flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === 'board' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('board')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Board</span>
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          {ACTIVE_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="bg-card relative overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${col.bar}`} />
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          {ACTIVE_COLUMNS.map((col) => {
            const columnTasks = groupedActive[col.key] ?? [];
            const columnTotalPages = Math.max(1, Math.ceil(columnTasks.length / BOARD_PAGE_SIZE));
            const columnPage = Math.min(columnPages[col.key] ?? 0, columnTotalPages - 1);
            const pagedColumnTasks = columnTasks.slice(
              columnPage * BOARD_PAGE_SIZE,
              (columnPage + 1) * BOARD_PAGE_SIZE,
            );
            return (
              <div
                key={col.key}
                className="bg-card relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${col.bar}`} />
                <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${col.accent}`}
                    >
                      <col.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {col.label}
                      </h3>
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                        {col.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${col.badge}`}
                  >
                    {columnTasks.length}
                  </span>
                </div>
                <div className="px-3 pb-3">
                  <div className="space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${col.dashedIcon}`}
                        >
                          <col.icon className="h-4 w-4" />
                        </span>
                        <p className="text-muted-foreground text-xs font-medium">
                          No {col.label.toLowerCase()} tasks
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Tasks will appear here
                        </p>
                      </div>
                    ) : (
                      pagedColumnTasks.map((task) => (
                        <BoardTaskCard
                          key={task.id}
                          task={task}
                          customer={getCustomer(task)}
                          vehicle={getVehicle(task)}
                          services={services}
                          completing={completingId === task.id}
                          onOpen={() => handleTaskClick(task)}
                          onMove={(toStatus) => handleQuickMove(task, toStatus)}
                          onComplete={() => handleComplete(task)}
                        />
                      ))
                    )}
                  </div>
                  {columnTotalPages > 1 && (
                    <div className="mt-3">
                      <PaginationControls
                        page={columnPage}
                        totalPages={columnTotalPages}
                        onPageChange={(p) => setColumnPages((prev) => ({ ...prev, [col.key]: p }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ListTableView
          tasks={tasks}
          customers={customers}
          services={services}
          onTaskClick={handleTaskClick}
          onStatusClick={handleStatusChange}
        />
      )}

      <TaskWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          tasksQuery.refetch();
          customersQuery.refetch();
          vehiclesQuery.refetch();
        }}
      />

      {statusChangeTask && (
        <StatusChangeDialog
          task={statusChangeTask}
          open={statusChangeOpen}
          onOpenChange={setStatusChangeOpen}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          customer={getCustomer(selectedTask)}
          vehicle={selectedVehicle}
          services={services}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedTask(null);
          }}
        />
      )}

      {collectPaymentTask && (
        <CollectPaymentDialog
          task={collectPaymentTask}
          customer={getCustomer(collectPaymentTask)}
          vehicle={getVehicle(collectPaymentTask)}
          services={services}
          loading={completingId === collectPaymentTask.id}
          onClose={() => setCollectPaymentTask(null)}
          onCollect={(amount) => handleCollectAndComplete(amount)}
        />
      )}

      <ReceiptModal
        sale={completedSale?.sale ?? null}
        customerName={completedSale?.customerName}
        onClose={() => setCompletedSale(null)}
      />
    </motion.div>
  );
}

function BoardTaskCard({
  task,
  customer,
  vehicle,
  services,
  completing,
  onOpen,
  onMove,
  onComplete,
}: {
  task: VehicleTask;
  customer: Customer | null;
  vehicle: Vehicle | null;
  services: Service[];
  completing: boolean;
  onOpen: () => void;
  onMove: (toStatus: TaskStatus) => void;
  onComplete: () => void;
}) {
  const selectedServices = services.filter((s) => task.serviceIds.includes(s.id));
  const vehicleLabel = vehicle ? `${vehicle.brand} · ${vehicle.model}` : null;

  const paymentDot =
    task.paymentStatus === 'FULL'
      ? 'bg-emerald-500'
      : task.paymentStatus === 'PARTIAL'
        ? 'bg-amber-500'
        : 'bg-slate-300 dark:bg-slate-600';

  return (
    <div
      onClick={onOpen}
      className="group bg-card cursor-pointer rounded-xl border border-slate-200 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/70 hover:shadow-md dark:border-slate-700/70 dark:hover:border-sky-500/40"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-[11px] font-bold text-white shadow-sm shadow-sky-500/30">
          {initials(customer?.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {customer?.name ?? 'Unknown'}
          </p>
          {customer?.phone && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.phone}</span>
            </p>
          )}
        </div>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${paymentDot}`}
          title={`Payment: ${task.paymentStatus}`}
        />
      </div>

      {vehicleLabel && (
        <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium dark:bg-slate-800">
          <CarFront className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{vehicleLabel}</span>
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {selectedServices.slice(0, 2).map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
            >
              {s.name}
            </span>
          ))}
          {selectedServices.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              +{selectedServices.length - 2} more
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Amount
        </span>
        <span className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
          {task.totalAmount.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {task.status === 'READY_FOR_PICKUP' ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Move back to In Progress"
              title="Move back"
              onClick={(e) => {
                e.stopPropagation();
                onMove('IN_PROGRESS');
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              disabled={completing}
              title={
                task.dueAmount > 0
                  ? `Collect due payment of ₹${task.dueAmount.toLocaleString('en-IN')} to complete`
                  : undefined
              }
              className={
                task.dueAmount > 0
                  ? 'flex-1 bg-amber-500 shadow-md shadow-amber-900/20 hover:bg-amber-600'
                  : 'flex-1 bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/30 hover:from-sky-500 hover:to-blue-500'
              }
            >
              {completing ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Completing…
                </>
              ) : task.dueAmount > 0 ? (
                <>
                  <Wallet className="h-3.5 w-3.5" />
                  Collect Due
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete & Receipt
                </>
              )}
            </Button>
          </>
        ) : task.status === 'IN_PROGRESS' ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Move back to Received"
              title="Move back"
              onClick={(e) => {
                e.stopPropagation();
                onMove('RECEIVED');
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-amber-300/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
              onClick={(e) => {
                e.stopPropagation();
                onMove('READY_FOR_PICKUP');
              }}
            >
              Mark Ready
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/30 hover:from-sky-500 hover:to-blue-500"
            onClick={(e) => {
              e.stopPropagation();
              onMove('IN_PROGRESS');
            }}
          >
            <Wrench className="h-3.5 w-3.5" />
            Start Task
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ListTableView({
  tasks,
  customers,
  services,
  onTaskClick,
  onStatusClick,
}: {
  tasks: VehicleTask[];
  customers: Customer[];
  services: Service[];
  onTaskClick: (task: VehicleTask) => void;
  onStatusClick: (task: VehicleTask) => void;
}) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [tasks, sortDir]);

  if (sorted.length === 0) {
    return (
      <EmptyState title="No tasks found" description="Create a new vehicle task to get started." />
    );
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / LIST_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * LIST_PAGE_SIZE, (safePage + 1) * LIST_PAGE_SIZE);

  return (
    <>
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-border border-b">
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Services</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Payment</th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium select-none"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              >
                <span className="inline-flex items-center gap-1">
                  Created
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${sortDir === 'desc' ? 'rotate-90' : '-rotate-90'}`}
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((task) => {
              const customer = customers.find((c) => c.id === task.customerId);
              const taskServices = services.filter((s) => task.serviceIds.includes(s.id));
              return (
                <tr
                  key={task.id}
                  className="border-border hover:bg-muted/50 cursor-pointer border-b transition-colors"
                  onClick={() => onTaskClick(task)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{customer?.name ?? 'Unknown'}</p>
                    <p className="text-muted-foreground text-xs">{customer?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {taskServices.map((s) => s.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusClick(task);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-transform hover:scale-105 ${
                        STATUS_BG[task.status] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          task.status === 'COMPLETED' || task.status === 'CANCELLED'
                            ? task.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                            : task.status === 'RECEIVED'
                              ? 'bg-blue-500'
                              : task.status === 'IN_PROGRESS'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                        }`}
                      />
                      {STATUS_LABELS[task.status] ?? task.status}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        task.paymentStatus === 'FULL'
                          ? 'text-green-600'
                          : task.paymentStatus === 'PARTIAL'
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                      }
                    >
                      {task.paymentStatus}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                    {new Date(task.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Page {safePage + 1} of {totalPages} · {sorted.length} tasks
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
};

function CollectPaymentDialog({
  task,
  customer,
  vehicle,
  services,
  loading,
  onClose,
  onCollect,
}: {
  task: VehicleTask;
  customer: Customer | null;
  vehicle: Vehicle | null;
  services: Service[];
  loading: boolean;
  onClose: () => void;
  onCollect: (amount: number) => void;
}) {
  const [amount, setAmount] = useState<number>(task.dueAmount);
  const [mode, setMode] = useState<string>(task.paymentMode || 'CASH');
  const overlayRef = useRef<HTMLDivElement>(null);
  const due = task.dueAmount;
  const valid = amount > 0 && amount <= due;

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const taskServices = services.filter((s) => task.serviceIds.includes(s.id));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collect-payment-title"
    >
      <div className="bg-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl">
        <div className="from-navy-light to-navy bg-gradient-to-br px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-sky-300 uppercase">
                  Payment Required
                </p>
                <h2 id="collect-payment-title" className="text-lg font-semibold">
                  Collect Due Payment
                </h2>
                <p className="text-sm text-white/60">{customer?.name ?? 'Customer'}</p>
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
                Total
              </p>
              <p className="text-lg font-semibold">₹{task.totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Paid
              </p>
              <p className="text-lg font-semibold text-emerald-400">
                ₹{task.paidAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-xl bg-amber-400/15 px-3 py-2.5 ring-1 ring-amber-400/30">
              <p className="text-[10px] font-semibold tracking-wider text-amber-200/70 uppercase">
                Due
              </p>
              <p className="text-lg font-semibold text-amber-300">₹{due.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="bg-muted/40 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="text-foreground block font-medium">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle'}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {taskServices.length > 0
                  ? taskServices.map((s) => s.name).join(', ')
                  : 'Service job'}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="collect-amount" className="text-[13px] font-medium">
                Amount to collect
              </Label>
              <button
                type="button"
                onClick={() => setAmount(due)}
                className="text-primary rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-blue-500/20"
              >
                Collect full ₹{due.toLocaleString('en-IN')}
              </button>
            </div>
            <div className="relative">
              <IndianRupee className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="collect-amount"
                type="number"
                min={1}
                max={due}
                className="h-12 pl-9 text-lg font-semibold"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            {!valid && (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Enter an amount between ₹1 and ₹{due.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Payment mode</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_MODES.map((m) => {
                const isSelected = mode === m;
                const Icon = PAYMENT_ICONS[m] ?? Wallet;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-150 active:scale-[0.97]',
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/25'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-blue-300',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-muted/40 flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onCollect(amount)}
            disabled={!valid || loading}
            className="shadow-md shadow-blue-900/20"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Processing…
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Collect & Complete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
