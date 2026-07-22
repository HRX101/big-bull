'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/use-operations';

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
    </motion.div>
  );
}
