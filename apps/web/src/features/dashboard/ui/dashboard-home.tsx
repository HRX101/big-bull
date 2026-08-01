'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { useInventoryDashboardData } from '@/features/inventory/api/use-inventory';
import { useQuery } from '@tanstack/react-query';
import {
  vehicleTaskRepository,
  posSaleRepository,
  leaveRequestRepository,
  salaryRecordRepository,
  productRepository,
} from '@car-spa/infrastructure';
import { motion } from 'framer-motion';
import { Car, DollarSign, Clock, AlertTriangle, BarChart3, Activity, Package, X, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { QuickActions } from './quick-actions';
import { EmployeeDashboard } from './employee-dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_PROGRESS: 'In Progress',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  READY_FOR_PICKUP: '#8b5cf6',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
};

function useOrgId() {
  return useAuthStore((s) => s.session?.orgId ?? '');
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
    queryFn: () => productRepository.findByOrgId(orgId),
    enabled: !!orgId,
  });

  const taskCountsQuery = useQuery({
    queryKey: ['task-counts-by-status', orgId],
    queryFn: () => vehicleTaskRepository.getCountByStatus(orgId),
    enabled: !!orgId,
  });

  const recentTasksQuery = useQuery({
    queryKey: ['recent-tasks', orgId],
    queryFn: () => vehicleTaskRepository.findByOrgId(orgId, { limit: 10 }),
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
  const taskCounts = taskCountsQuery.data;
  const recentTasks = recentTasksQuery.data ?? [];

  const chartData = taskCounts
    ? Object.entries(taskCounts).map(([status, count]) => ({
        name: STATUS_LABELS[status] ?? status,
        count,
        fill: STATUS_COLORS[status] ?? '#6b7280',
      }))
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your workshop command center.</p>
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your workshop command center.</p>
        </div>
        <QuickActions />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Car className="h-5 w-5" />}
          label="Tasks Today"
          value={tasksToday}
          loading={tasksTodayQuery.isLoading}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Revenue Today"
          value={`₹${revenueToday.toLocaleString('en-IN')}`}
          loading={revenueTodayQuery.isLoading}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Approvals"
          value={pendingLeaves + pendingSalary}
          loading={pendingLeavesQuery.isLoading || pendingSalaryQuery.isLoading}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Low Stock Items"
          value={lowStockItems.length}
          loading={inventoryQuery.isLoading}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Inventory Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={<Package className="h-5 w-5 text-blue-600" />}
            label="Total Products"
            value={inventoryDashboard.totalProducts}
            loading={inventoryDashboard.isLoading}
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
            label="Low Stock"
            value={inventoryDashboard.lowStockCount}
            loading={inventoryDashboard.isLoading}
          />
          <StatCard
            icon={<X className="h-5 w-5 text-red-600" />}
            label="Out of Stock"
            value={inventoryDashboard.outOfStockCount}
            loading={inventoryDashboard.isLoading}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-purple-600" />}
            label="Expiring Soon"
            value={inventoryDashboard.expiringSoon}
            loading={inventoryDashboard.isLoading}
          />
          <StatCard
            icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />}
            label="Today's Movements"
            value={inventoryDashboard.todayMovements}
            loading={inventoryDashboard.isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tasks by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taskCountsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <EmptyState
                title="No data"
                description="No vehicle tasks found."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasksQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <EmptyState
                title="No activity"
                description="Recent vehicle tasks will appear here."
              />
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border-border flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-500'
                          : task.status === 'CANCELLED'
                            ? 'bg-red-500'
                            : task.status === 'IN_PROGRESS'
                              ? 'bg-amber-500'
                              : task.status === 'READY_FOR_PICKUP'
                                ? 'bg-purple-500'
                                : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        Task <span className="font-medium">#{task.id.slice(0, 8)}</span>{' '}
                        <span className="text-muted-foreground">
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        ₹{task.totalAmount.toLocaleString('en-IN')} ·{' '}
                        {new Date(task.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-display text-2xl tracking-tight">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
