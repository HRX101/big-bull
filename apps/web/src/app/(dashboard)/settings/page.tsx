'use client';

import { motion } from 'framer-motion';

export default function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h1 className="font-display text-3xl tracking-tight">Settings</h1>
      <p className="text-muted-foreground">
        Workshop preferences and organization settings will be configured here.
      </p>
    </motion.div>
  );
}
