'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { type TaskStatus } from '@car-spa/shared';
import { LayoutGrid, List, Plus, Search, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useVehicleTasks,
  useCustomers,
  useServices,
  useVehiclesByOrg,
  useChangeTaskStatus,
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
  RECEIVED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const ACTIVE_COLUMNS: { key: TaskStatus; label: string; bg: string; border: string; text: string }[] = [
  {
    key: 'RECEIVED',
    label: 'Received',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
  },
  {
    key: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
  },
];

const MOVE_NOTES: Record<string, string> = {
  IN_PROGRESS: 'Moved to In Progress from board',
  READY_FOR_PICKUP: 'Marked ready for pickup',
  RECEIVED: 'Moved back to Received from board',
};

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
  const [completedSale, setCompletedSale] = useState<{ sale: POSSale; customerName?: string | null } | null>(null);

  const tasksQuery = useVehicleTasks(orgId);
  const customersQuery = useCustomers(orgId);
  const servicesQuery = useServices(orgId);
  const vehiclesQuery = useVehiclesByOrg(orgId);
  const changeStatus = useChangeTaskStatus();
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

  async function handleComplete(task: VehicleTask) {
    if (completingId) return;
    if (task.dueAmount > 0) {
      toast.error(
        `Clear the due payment of ₹${task.dueAmount.toLocaleString('en-IN')} before completing the task.`,
      );
      return;
    }
    setCompletingId(task.id);
    try {
      const statusResult = await changeStatus.mutateAsync({
        taskId: task.id,
        toStatus: 'COMPLETED',
        note: 'Task completed and receipt generated',
      });
      if (!statusResult.success) {
        toast.error(statusResult.error.message);
        return;
      }

      const taskServices = services.filter((s) => task.serviceIds.includes(s.id));
      let items: { itemId: string; itemName: string; quantity: number; unitPrice: number }[];
      if (taskServices.length > 0) {
        const count = taskServices.length;
        const base = Math.round((task.totalAmount / count) * 100) / 100;
        items = taskServices.map((s, i) => ({
          itemId: '',
          itemName: s.name,
          quantity: 1,
          unitPrice: i === count - 1
            ? Math.round((task.totalAmount - base * (count - 1)) * 100) / 100
            : base,
        }));
      } else {
        items = [{ itemId: '', itemName: 'Service', quantity: 1, unitPrice: task.totalAmount }];
      }

      const saleResult = await createSale.mutateAsync({
        customerId: task.customerId,
        items,
        paymentMode: task.paymentMode,
      });
      if (!saleResult.success) {
        toast.error(saleResult.error.message);
        return;
      }

      const customer = customerById.get(task.customerId);
      setCompletedSale({ sale: saleResult.value, customerName: customer?.name });
      toast.success('Task completed and receipt generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Vehicle Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage service tasks on the board.</p>
        </div>
        <Button
          onClick={() => setWizardOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by customer name or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="bg-muted rounded-md p-0.5">
          <Button
            variant={view === 'board' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('board')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {ACTIVE_COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-xl border-2 border-dashed p-3 ${col.bg} ${col.border}`}>
              <Skeleton className="h-5 w-24" />
              <div className="mt-3 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 items-start">
          {ACTIVE_COLUMNS.map((col) => {
            const columnTasks = groupedActive[col.key] ?? [];
            return (
              <div key={col.key} className={`rounded-xl border-2 border-dashed p-3 ${col.bg} ${col.border}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={`font-semibold ${col.text}`}>{col.label}</h3>
                  <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-xs">No tasks</p>
                  ) : (
                    columnTasks.map((task) => (
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

  return (
    <div
      onClick={onOpen}
      className="bg-card cursor-pointer rounded-lg border shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold">{customer?.name ?? 'Unknown'}</p>
        </div>
        {customer?.phone && (
          <p className="text-muted-foreground text-xs">{customer.phone}</p>
        )}
        {vehicleLabel && <p className="text-sm">{vehicleLabel}</p>}
        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedServices.slice(0, 2).map((s) => (
              <span key={s.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                {s.name}
              </span>
            ))}
            {selectedServices.length > 2 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                +{selectedServices.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t p-2">
        {task.status === 'READY_FOR_PICKUP' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2"
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
              disabled={completing || task.dueAmount > 0}
              title={task.dueAmount > 0 ? `Due payment of ₹${task.dueAmount.toLocaleString('en-IN')} must be cleared first` : undefined}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              {completing ? 'Completing…' : task.dueAmount > 0 ? 'Due Payment' : 'Complete & Receipt'}
            </Button>
          </div>
        ) : task.status === 'IN_PROGRESS' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2"
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
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onMove('READY_FOR_PICKUP');
              }}
            >
              Mark Ready
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onMove('IN_PROGRESS');
            }}
          >
            Start
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

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [tasks, sortDir]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No tasks found"
        description="Create a new vehicle task to get started."
      />
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-border border-b">
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Services</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Payment</th>
            <th
              className="px-4 py-3 text-right font-medium cursor-pointer select-none"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <span className="inline-flex items-center gap-1">
                Created
                <ChevronRight className={`h-3 w-3 transition-transform ${sortDir === 'desc' ? 'rotate-90' : '-rotate-90'}`} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
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
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_BG[task.status] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STATUS_LABELS[task.status] ?? task.status}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={task.paymentStatus === 'FULL' ? 'text-green-600' : task.paymentStatus === 'PARTIAL' ? 'text-amber-600' : 'text-muted-foreground'}>
                    {task.paymentStatus}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                  {new Date(task.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
