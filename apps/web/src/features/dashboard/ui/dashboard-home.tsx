'use client';

import { motion } from 'framer-motion';
import { EmptyState } from '@/components/shared/empty-state';

export function DashboardHome() {
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
      <EmptyState
        title="Modules coming soon"
        description="Customers, vehicle tasks, inventory, POS, and payroll will appear here as they are implemented in upcoming phases."
      />
    </motion.div>
  );
}
