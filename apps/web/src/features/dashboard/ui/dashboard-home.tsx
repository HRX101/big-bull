'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { useAnalytics } from '@/hooks/use-operations';

const modules = [
  { href: PROTECTED_ROUTES.customers, title: 'Customers', desc: 'Contacts & CRM' },
  { href: PROTECTED_ROUTES.vehicles, title: 'Vehicles', desc: 'Registered cars' },
  { href: PROTECTED_ROUTES.tasks, title: 'Tasks', desc: 'Workflow pipeline' },
  { href: PROTECTED_ROUTES.inventory, title: 'Inventory', desc: 'Parts & supplies' },
  { href: PROTECTED_ROUTES.employees, title: 'Employees', desc: 'Staff records' },
  { href: PROTECTED_ROUTES.mechanics, title: 'Mechanics', desc: 'Technicians' },
  { href: PROTECTED_ROUTES.pos, title: 'POS', desc: 'Sales & receipts' },
  { href: PROTECTED_ROUTES.payroll, title: 'Payroll', desc: 'Salary runs' },
  { href: PROTECTED_ROUTES.auditLogs, title: 'Audit Logs', desc: 'Activity trail' },
  { href: PROTECTED_ROUTES.notifications, title: 'Notifications', desc: 'Alerts' },
  { href: PROTECTED_ROUTES.analytics, title: 'Analytics', desc: 'KPI dashboard' },
];

export function DashboardHome() {
  const { data: analytics } = useAnalytics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your workshop command center.</p>
      </div>
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-normal">
                Active tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{analytics.activeTaskCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-normal">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{analytics.customerCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-normal">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">₹{analytics.totalRevenue.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-normal">Low stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{analytics.lowStockCount}</p>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:bg-muted/30 h-full transition-colors">
              <CardHeader>
                <CardTitle>{mod.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{mod.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
