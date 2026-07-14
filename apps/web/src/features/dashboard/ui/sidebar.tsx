'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROTECTED_ROUTES } from '@car-spa/shared';

const navItems = [
  { href: PROTECTED_ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { href: PROTECTED_ROUTES.settings, label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border/60 bg-card/40 flex w-60 flex-col border-r p-4">
      <div className="mb-8 px-2">
        <p className="font-display text-2xl tracking-tight">Big Bull Car Spa</p>
        <p className="text-muted-foreground text-xs">Workshop ERP</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="text-muted-foreground px-2 text-xs">Phase 1 — Foundation</p>
    </aside>
  );
}
