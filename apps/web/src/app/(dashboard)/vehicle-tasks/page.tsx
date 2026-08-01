'use client';

import { motion } from 'framer-motion';
import { VehicleTasksPage } from '@/features/vehicle-tasks/ui/vehicle-tasks-page';

export default function VehicleTasksRoute() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <VehicleTasksPage />
    </motion.div>
  );
}
