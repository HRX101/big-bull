'use client';

import { motion } from 'framer-motion';
import { EmployeesPage } from '@/features/employees/ui/employees-page';

export default function EmployeesRoute() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <EmployeesPage />
    </motion.div>
  );
}
