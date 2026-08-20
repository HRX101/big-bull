'use client';

import { useState } from 'react';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useInventoryDashboardData } from '@/features/inventory/api/use-inventory';
import { useQuery } from '@tanstack/react-query';
import {
  vehicleTaskRepository,
  posSaleRepository,
  leaveRequestRepository,
  salaryRecordRepository,
  productRepository,
  stockMovementRepository,
} from '@car-spa/infrastructure';
import { motion } from 'framer-motion';
import {
  Car,
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  Package,
  X,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination';
import { QuickActions } from './quick-actions';
import { DueOverview } from './due-overview';
import { EmployeeDashboard } from './employee-dashboard';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function useOrgId() {
  return useAuthStore((s) => s.session?.orgId ?? '');
}

type ActivityItem =
  | { kind: 'task'; id: string; createdAt: Date; status: string; totalAmount: number }
  | { kind: 'sale'; id: string; createdAt: Date; receiptNumber: string; totalAmount: number }
  | {
      kind: 'movement';
      id: string;
      createdAt: Date;
      type: string;
      quantity: number;
      productName: string;
    };

function activityDisplay(item: ActivityItem): {
  Icon: LucideIcon;
  tone: string;
  title: string;
  meta: string;
} {
  if (item.kind === 'task') {
    return {
      Icon: Car,
      tone: 'text-blue-500',
      title: `Task #${item.id.slice(0, 8)}`,
      meta: `${STATUS_LABELS[item.status] ?? item.status} · ₹${item.totalAmount.toLocaleString('en-IN')}`,
    };
  }
  if (item.kind === 'sale') {
    return {
      Icon: ShoppingCart,
      tone: 'text-emerald-500',
      title: `Sale ${item.receiptNumber}`,
      meta: `₹${item.totalAmount.toLocaleString('en-IN')}`,
    };
  }
  const isIn = item.type === 'RESTOCK_IN';
  return {
    Icon: isIn ? ArrowDownCircle : ArrowUpCircle,
    tone: isIn ? 'text-emerald-500' : 'text-red-500',
    title: `${isIn ? 'Restocked' : 'Stock deducted'} · ${item.productName}`,
    meta: `${isIn ? '+' : '-'}${item.quantity} units`,
  };
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const display = activityDisplay(item);
  return (
    <div className="border-border/60 bg-card hover:border-border flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors">
      <span
        className={`bg-muted/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${display.tone}`}
      >
        <display.Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{display.title}</p>
        <p className="text-muted-foreground text-xs">
          {display.meta} ·{' '}
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {item.kind === 'task' && (
        <Badge variant={taskBadgeVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
      )}
    </div>
  );
}

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

export function DashboardHome() {
  const role = useAuthStore((s) => s.session?.role ?? 'employee');
  if (role !== 'owner') return <EmployeeDashboard />;
  return <OwnerDashboard />;
}

export function OwnerDashboard() {
  const orgId = useOrgId();

  const tasksTodayQuery = useQuery({
    queryKey: ['tasks-today-count', orgId],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const tasks = await vehicleTaskRepository.findByOrgId(orgId);
      return tasks.filter((t) => new Date(t.createdAt) >= start).length;
    },
    enabled: !!orgId,
  });

  const revenueTodayQuery = useQuery({
    queryKey: ['revenue-today', orgId],
    queryFn: () => posSaleRepository.getDailyTotal(orgId),
    enabled: !!orgId,
  });

  const pendingLeavesQuery = useQuery({
    queryKey: ['pending-leaves-count', orgId],
    queryFn: () => leaveRequestRepository.getPendingCount(orgId),
    enabled: !!orgId,
  });

  const pendingSalaryQuery = useQuery({
    queryKey: ['pending-salary-count', orgId],
    queryFn: () => salaryRecordRepository.getPendingCount(orgId),
    enabled: !!orgId,
  });

  const inventoryQuery = useQuery({
    queryKey: ['inventory-low-stock', orgId],
    queryFn: () => productRepository.findByOrgId(orgId, { limit: 500 }),
    enabled: !!orgId,
  });

  const recentTasksQuery = useQuery({
    queryKey: ['recent-tasks', orgId],
    queryFn: () => vehicleTaskRepository.findByOrgId(orgId, { limit: 10 }),
    enabled: !!orgId,
  });

  const recentMovementsQuery = useQuery({
    queryKey: ['recent-stock-movements', orgId],
    queryFn: () => stockMovementRepository.findByOrgId(orgId, { limit: 15 }),
    enabled: !!orgId,
  });

  const recentSalesQuery = useQuery({
    queryKey: ['recent-pos-sales', orgId],
    queryFn: () => posSaleRepository.findByOrgId(orgId, { limit: 10 }),
    enabled: !!orgId,
  });

  const loading = !orgId;
  const tasksToday = tasksTodayQuery.data ?? 0;
  const revenueToday = revenueTodayQuery.data ?? 0;
  const pendingLeaves = pendingLeavesQuery.data ?? 0;
  const pendingSalary = pendingSalaryQuery.data ?? 0;
  const inventoryDashboard = useInventoryDashboardData(orgId);
  const lowStockItems = (inventoryQuery.data ?? []).filter(
    (item) => item.currentStock <= item.lowStockThreshold,
  );
  const recentTasks = recentTasksQuery.data ?? [];
  const recentMovements = recentMovementsQuery.data ?? [];
  const recentSales = recentSalesQuery.data ?? [];

  const productNameById = new Map((inventoryQuery.data ?? []).map((p) => [p.id, p.name]));

  const activityItems: ActivityItem[] = [
    ...recentTasks.map((task) => ({
      kind: 'task' as const,
      id: task.id,
      createdAt: task.createdAt,
      status: task.status,
      totalAmount: task.totalAmount,
    })),
    ...recentSales.map((sale) => ({
      kind: 'sale' as const,
      id: sale.id,
      createdAt: sale.createdAt,
      receiptNumber: sale.receiptNumber,
      totalAmount: sale.totalAmount,
    })),
    ...recentMovements.map((movement) => ({
      kind: 'movement' as const,
      id: movement.id,
      createdAt: movement.createdAt,
      type: movement.type,
      quantity: movement.quantity,
      productName: productNameById.get(movement.productId) ?? 'Product',
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const activityLoading =
    recentTasksQuery.isLoading || recentSalesQuery.isLoading || recentMovementsQuery.isLoading;

  const ACTIVITY_PAGE_SIZE = 5;
  const activityTotalPages = Math.max(1, Math.ceil(activityItems.length / ACTIVITY_PAGE_SIZE));
  const [activityPage, setActivityPage] = useState(0);
  const safeActivityPage = Math.min(activityPage, activityTotalPages - 1);
  const pagedActivity = activityItems.slice(
    safeActivityPage * ACTIVITY_PAGE_SIZE,
    (safeActivityPage + 1) * ACTIVITY_PAGE_SIZE,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="Your workshop command center."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your workshop command center."
        action={<QuickActions />}
      />

      <DueOverview />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <MetricCard
          icon={<Car className="h-4 w-4" />}
          tone="blue"
          label="Tasks Today"
          value={tasksToday}
          loading={tasksTodayQuery.isLoading}
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          tone="emerald"
          label="Revenue Today"
          value={`₹${revenueToday.toLocaleString('en-IN')}`}
          loading={revenueTodayQuery.isLoading}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
          label="Pending Approvals"
          value={pendingLeaves + pendingSalary}
          loading={pendingLeavesQuery.isLoading || pendingSalaryQuery.isLoading}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="rose"
          label="Low Stock Items"
          value={lowStockItems.length}
          loading={inventoryQuery.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="text-primary h-4 w-4" />
            Inventory Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat
              icon={<Package className="h-4 w-4" />}
              tone="text-blue-500"
              label="Total Products"
              value={inventoryDashboard.totalProducts}
              loading={inventoryDashboard.isLoading}
            />
            <MiniStat
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="text-amber-500"
              label="Low Stock"
              value={inventoryDashboard.lowStockCount}
              loading={inventoryDashboard.isLoading}
            />
            <MiniStat
              icon={<X className="h-4 w-4" />}
              tone="text-red-500"
              label="Out of Stock"
              value={inventoryDashboard.outOfStockCount}
              loading={inventoryDashboard.isLoading}
            />
            <MiniStat
              icon={<Clock className="h-4 w-4" />}
              tone="text-purple-500"
              label="Expiring Soon"
              value={inventoryDashboard.expiringSoon}
              loading={inventoryDashboard.isLoading}
            />
            <MiniStat
              icon={<ShoppingCart className="h-4 w-4" />}
              tone="text-emerald-500"
              label="Today's Movements"
              value={inventoryDashboard.todayMovements}
              loading={inventoryDashboard.isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="text-primary h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <EmptyState
              title="No activity"
              description="Recent stock movements, sales and tasks will appear here."
            />
          ) : (
            <div className="space-y-2">
              {pagedActivity.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
          {!activityLoading && activityItems.length > 0 && (
            <PaginationControls
              page={safeActivityPage}
              totalPages={activityTotalPages}
              onPageChange={setActivityPage}
              itemCount={activityItems.length}
              itemLabel="items"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const STAT_TONES: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-500',
  emerald: 'bg-emerald-500/15 text-emerald-500',
  amber: 'bg-amber-500/15 text-amber-500',
  rose: 'bg-rose-500/15 text-rose-500',
};

function MetricCard({
  icon,
  tone,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  tone: keyof typeof STAT_TONES;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="border-border bg-card flex flex-col rounded-2xl border p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  tone,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="border-border/60 flex items-center gap-3 rounded-xl border p-3">
      <span
        className={`bg-muted/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-[10px] font-bold tracking-wider uppercase">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-12" />
        ) : (
          <p className="text-lg font-bold tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}
