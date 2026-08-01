'use client';

import { motion } from 'framer-motion';
import { MechanicsPage } from '@/features/mechanics/ui/mechanics-page';

export default function MechanicsRoute() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <MechanicsPage />
    </motion.div>
  );
}
