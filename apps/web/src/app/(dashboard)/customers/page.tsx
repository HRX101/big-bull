'use client';

import { motion } from 'framer-motion';
import { CustomersPage } from '@/features/customers/ui/customers-page';

export default function CustomersRoute() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <CustomersPage />
    </motion.div>
  );
}
