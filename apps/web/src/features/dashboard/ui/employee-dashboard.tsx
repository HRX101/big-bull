'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PackagePlus,
  PlusCircle,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
  UserPlus,
  Users,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { auditRepository, customerRepository, userRepository, vehicleRepository, vehicleTaskRepository } from '@car-spa/infrastructure';
import { PROTECTED_ROUTES, type TaskStatus } from '@car-spa/shared';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import type { AuditLogEntry, Vehicle, VehicleTask } from '@car-spa/domain';

const TASK_STYLES: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PENDING_TASK_STATUSES: TaskStatus[] = ['RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP'];

const TASK_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function formatAmount(amount: unknown) {
  const n = Number(amount);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '';
}

function formatTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function describeAction(entry: AuditLogEntry): { icon: LucideIcon; text: string } {
  const metadata = entry.metadata ?? {};
  const amount = formatAmount(metadata.amount);
  switch (entry.action) {
    case 'vehicleTask.create':
      return { icon: ClipboardList, text: `created a vehicle task${amount ? ` · ${amount}` : ''}` };
    case 'vehicleTask.statusChange':
      return {
        icon: RefreshCw,
        text: `changed a task to ${TASK_STATUS_LABELS[String(metadata.to)] ?? metadata.to}`,
      };
    case 'posSale.create':
      return { icon: ShoppingCart, text: `completed a sale${amount ? ` · ${amount}` : ''}` };
    case 'leaveRequest.create':
      return { icon: CalendarDays, text: 'requested leave' };
    case 'leaveRequest.approved':
      return { icon: CheckCircle2, text: 'approved a leave request' };
    case 'leaveRequest.rejected':
      return { icon: XCircle, text: 'rejected a leave request' };
    case 'salaryRecord.create':
      return { icon: Wrench, text: 'created a salary record' };
    case 'customer.create':
      return { icon: UserPlus, text: 'added a customer' };
    case 'product.create':
      return { icon: PackagePlus, text: 'added a product' };
    case 'category.create':
      return { icon: PlusCircle, text: 'added a category' };
    case 'stockMovement.create':
      return { icon: RefreshCw, text: 'recorded a stock movement' };
    case 'supplier.create':
      return { icon: Truck, text: 'added a supplier' };
    case 'mechanic.create':
      return { icon: UserPlus, text: 'added a mechanic' };
    case 'mechanicLedger.create':
      return { icon: Wrench, text: 'updated a mechanic ledger' };
    case 'storeSettings.update':
      return { icon: Store, text: 'updated store settings' };
    case 'org.bootstrap':
      return { icon: Users, text: 'set up the workspace' };
    default:
      return { icon: Activity, text: entry.action.replace(/\./g, ' ') };
  }
}

function TaskTodoRow({ task, customerName, vehicle }: { task: VehicleTask; customerName: string; vehicle: Vehicle | null }) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{customerName}</p>
        <p className="text-muted-foreground text-xs">
          {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}` : 'Vehicle'}
          {task.notes ? ` · ${task.notes}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.totalAmount > 0 && (
          <span className="text-muted-foreground text-xs">₹{task.totalAmount.toLocaleString('en-IN')}</span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STYLES[task.status] ?? ''}`}>
          {TASK_STATUS_LABELS[task.status] ?? task.status}
        </span>
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const safePage = Math.min(page, totalPages);
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
      <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EmployeeDashboard() {
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');

  const usersQ = useQuery({
    queryKey: ['users', orgId],
    queryFn: () => userRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
  const logsQ = useQuery({
    queryKey: ['audit-logs', orgId],
    queryFn: () => auditRepository.findByOrgId(orgId, { limit: 100 }),
    enabled: !!orgId,
  });
  const tasksQ = useQuery({
    queryKey: ['vehicle-tasks', orgId],
    queryFn: () => vehicleTaskRepository.findByOrgId(orgId, { limit: 300 }),
    enabled: !!orgId,
  });
  const customersQ = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => customerRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });
  const vehiclesQ = useQuery({
    queryKey: ['vehicles', orgId],
    queryFn: () => vehicleRepository.findByOrgId(orgId, { limit: 200 }),
    enabled: !!orgId,
  });

  const [taskPage, setTaskPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const TASK_PAGE_SIZE = 5;
  const ACTIVITY_PAGE_SIZE = 10;

  const users = usersQ.data ?? [];
  const nameOf = (userId: string) => users.find((u) => u.id === userId)?.displayName ?? 'Team member';

  const customerById = useMemo(
    () => new Map((customersQ.data ?? []).map((c) => [c.id, c])),
    [customersQ.data],
  );
  const vehicleById = useMemo(
    () => new Map((vehiclesQ.data ?? []).map((v) => [v.id, v])),
    [vehiclesQ.data],
  );

  const allTasks = tasksQ.data ?? [];
  const pendingTasks = allTasks.filter((t) => PENDING_TASK_STATUSES.includes(t.status));
  const feed = logsQ.data ?? [];
  const loading =
    usersQ.isLoading || logsQ.isLoading || tasksQ.isLoading || customersQ.isLoading || vehiclesQ.isLoading;

  const taskTotalPages = Math.max(1, Math.ceil(pendingTasks.length / TASK_PAGE_SIZE));
  const safeTaskPage = Math.min(taskPage, taskTotalPages);
  const paginatedTasks = pendingTasks.slice((safeTaskPage - 1) * TASK_PAGE_SIZE, safeTaskPage * TASK_PAGE_SIZE);

  const activityTotalPages = Math.max(1, Math.ceil(feed.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedFeed = feed.slice((safeActivityPage - 1) * ACTIVITY_PAGE_SIZE, safeActivityPage * ACTIVITY_PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-3xl tracking-tight">Team Dashboard</h1>
        <p className="text-muted-foreground">Pending work and activity across the workshop.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Todo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : pendingTasks.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-8 text-center text-sm">
              No pending vehicle tasks.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Vehicle Tasks · {pendingTasks.length}
                </p>
                <Link
                  href={PROTECTED_ROUTES.vehicleTasks}
                  className="text-muted-foreground hover:text-foreground text-xs font-medium"
                >
                  View all
                </Link>
              </div>
              {paginatedTasks.map((task) => (
                <TaskTodoRow
                  key={task.id}
                  task={task}
                  customerName={customerById.get(task.customerId)?.name ?? 'Customer'}
                  vehicle={vehicleById.get(task.vehicleId) ?? null}
                />
              ))}
              {taskTotalPages > 1 && (
                <PaginationControls page={safeTaskPage} totalPages={taskTotalPages} onPageChange={setTaskPage} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <EmptyState title="No activity yet" description="Actions across the workshop will appear here." />
          ) : (
            <>
              <div className="space-y-2">
                {paginatedFeed.map((entry) => {
                  const { icon: Icon, text } = describeAction(entry);
                  return (
                    <div
                      key={entry.id}
                      className="border-border flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="bg-muted text-muted-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words">
                          <span className="font-medium">{nameOf(entry.actorId)}</span>{' '}
                          <span className="text-muted-foreground">{text}</span>
                        </p>
                        <p className="text-muted-foreground text-xs">{formatTime(entry.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activityTotalPages > 1 && (
                <PaginationControls page={safeActivityPage} totalPages={activityTotalPages} onPageChange={setActivityPage} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
