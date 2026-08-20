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
  Car,
  type LucideIcon,
} from 'lucide-react';
import {
  auditRepository,
  customerRepository,
  userRepository,
  vehicleRepository,
  vehicleTaskRepository,
} from '@car-spa/infrastructure';
import { PROTECTED_ROUTES, type TaskStatus } from '@car-spa/shared';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { QuickActions } from './quick-actions';
import { DueOverview } from './due-overview';
import type { AuditLogEntry, Vehicle, VehicleTask } from '@car-spa/domain';

const PENDING_TASK_STATUSES: TaskStatus[] = ['RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP'];

const TASK_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function taskBadgeVariant(status: string) {
  switch (status) {
    case 'RECEIVED':
      return 'info';
    case 'IN_PROGRESS':
      return 'warning';
    case 'READY_FOR_PICKUP':
      return 'purple';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'red';
    default:
      return 'secondary';
  }
}

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

function TaskTodoRow({
  task,
  customerName,
  vehicle,
}: {
  task: VehicleTask;
  customerName: string;
  vehicle: Vehicle | null;
}) {
  return (
    <div className="border-border/60 bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
        <Car className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{customerName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}` : 'Vehicle'}
          {task.notes ? ` · ${task.notes}` : ''}
        </p>
      </div>
      {task.totalAmount > 0 && (
        <span className="text-muted-foreground shrink-0 text-xs font-medium">
          ₹{task.totalAmount.toLocaleString('en-IN')}
        </span>
      )}
      <Badge variant={taskBadgeVariant(task.status)}>
        {TASK_STATUS_LABELS[task.status] ?? task.status}
      </Badge>
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
      <Button
        variant="outline"
        size="sm"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-muted-foreground text-sm">
        Page {safePage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
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
  const ACTIVITY_PAGE_SIZE = 5;

  const users = usersQ.data ?? [];
  const nameOf = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? 'Team member';

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
    usersQ.isLoading ||
    logsQ.isLoading ||
    tasksQ.isLoading ||
    customersQ.isLoading ||
    vehiclesQ.isLoading;

  const taskTotalPages = Math.max(1, Math.ceil(pendingTasks.length / TASK_PAGE_SIZE));
  const safeTaskPage = Math.min(taskPage, taskTotalPages);
  const paginatedTasks = pendingTasks.slice(
    (safeTaskPage - 1) * TASK_PAGE_SIZE,
    safeTaskPage * TASK_PAGE_SIZE,
  );

  const activityTotalPages = Math.max(1, Math.ceil(feed.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedFeed = feed.slice(
    (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    safeActivityPage * ACTIVITY_PAGE_SIZE,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Team"
        title="Team Dashboard"
        description="Pending work and activity across the workshop."
        action={<QuickActions />}
      />

      <DueOverview />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="text-primary h-4 w-4" />
            Todo
          </CardTitle>
          <Link
            href={PROTECTED_ROUTES.vehicleTasks}
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : pendingTasks.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-8 text-center text-sm">
              No pending vehicle tasks.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Vehicle Tasks · {pendingTasks.length}
                </p>
              </div>
              <div className="space-y-2">
                {paginatedTasks.map((task) => (
                  <TaskTodoRow
                    key={task.id}
                    task={task}
                    customerName={customerById.get(task.customerId)?.name ?? 'Customer'}
                    vehicle={vehicleById.get(task.vehicleId) ?? null}
                  />
                ))}
              </div>
              {taskTotalPages > 1 && (
                <PaginationControls
                  page={safeTaskPage}
                  totalPages={taskTotalPages}
                  onPageChange={setTaskPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="text-primary h-4 w-4" />
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
            <EmptyState
              title="No activity yet"
              description="Actions across the workshop will appear here."
            />
          ) : (
            <>
              <div className="space-y-2">
                {paginatedFeed.map((entry) => {
                  const { icon: Icon, text } = describeAction(entry);
                  return (
                    <div
                      key={entry.id}
                      className="border-border/60 bg-card hover:border-border flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors"
                    >
                      <span className="bg-muted/70 text-muted-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words">
                          <span className="font-medium">{nameOf(entry.actorId)}</span>{' '}
                          <span className="text-muted-foreground">{text}</span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activityTotalPages > 1 && (
                <PaginationControls
                  page={safeActivityPage}
                  totalPages={activityTotalPages}
                  onPageChange={setActivityPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
