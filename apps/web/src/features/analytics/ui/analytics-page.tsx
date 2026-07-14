'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { PageHeader } from '@/components/shared/page-header';
import { useAnalytics } from '@/hooks/use-operations';

const metricCards = [
  { key: 'customerCount', label: 'Customers', href: PROTECTED_ROUTES.customers },
  { key: 'vehicleCount', label: 'Vehicles', href: PROTECTED_ROUTES.vehicles },
  { key: 'activeTaskCount', label: 'Active tasks', href: PROTECTED_ROUTES.tasks },
  { key: 'inventoryItemCount', label: 'Inventory items', href: PROTECTED_ROUTES.inventory },
  { key: 'employeeCount', label: 'Employees', href: PROTECTED_ROUTES.employees },
  { key: 'paidOrderCount', label: 'Paid orders', href: PROTECTED_ROUTES.pos },
  { key: 'totalRevenue', label: 'Revenue (₹)', href: PROTECTED_ROUTES.analytics, format: (v: number) => v.toFixed(2) },
  { key: 'lowStockCount', label: 'Low stock alerts', href: PROTECTED_ROUTES.inventory },
] as const;

export function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Workshop KPIs aggregated across modules." />
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {error && <p className="text-destructive text-sm">{error.message}</p>}
      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => {
            const raw = data[card.key as keyof typeof data] as number;
            const value = 'format' in card && card.format ? card.format(raw) : String(raw);
            return (
              <Link key={card.key} href={card.href}>
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm font-normal">{card.label}</CardTitle></CardHeader>
                  <CardContent><p className="font-display text-3xl">{value}</p></CardContent>
                </Card>
              </Link>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
