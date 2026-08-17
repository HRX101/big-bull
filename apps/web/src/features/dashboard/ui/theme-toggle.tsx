'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="group focus-visible:ring-offset-navy relative inline-flex h-9 w-[72px] shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-white/5 p-1 shadow-inner shadow-black/10 transition-all duration-200 hover:border-sky-300/40 hover:bg-white/10 hover:shadow-sky-400/20 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
    >
      <span className="relative z-10 flex w-full items-center justify-between px-1.5">
        <Sun
          className={cn(
            'h-4 w-4 transition-all duration-300 group-hover:scale-110',
            isDark ? 'scale-90 text-slate-600' : 'scale-100 text-amber-300',
          )}
        />
        <Moon
          className={cn(
            'h-4 w-4 transition-all duration-300 group-hover:scale-110',
            isDark ? 'scale-100 text-sky-300' : 'scale-90 text-slate-600',
          )}
        />
      </span>

      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: isDark ? 32 : 0 }}
        transition={{ type: 'spring', stiffness: 550, damping: 32, mass: 0.9 }}
        className={cn(
          'pointer-events-none absolute inset-y-1 left-1 z-0 w-[32px] rounded-full shadow-sm transition-colors duration-300',
          'bg-gradient-to-r from-sky-400/30 to-cyan-400/30',
          isDark
            ? 'border border-sky-300/30 from-sky-400/35 to-indigo-400/35'
            : 'border border-amber-300/30 from-amber-400/30 to-orange-400/25',
        )}
      />
    </button>
  );
}
