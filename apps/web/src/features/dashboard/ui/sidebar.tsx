'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@car-spa/shared';

const iconMap = {
  Dashboard: LayoutDashboard,
  'Vehicle Task': ClipboardList,
  Inventory: Package,
  POS: Receipt,
  Customers: Users,
  Mechanics: Wrench,
  'Employee Management': Users,
  Settings: Settings,
} as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border/60 bg-card/40 flex w-60 flex-col border-r p-4">
      <div className="mb-8 px-2">
        <p className="font-display text-2xl tracking-tight">Big Bull Car Spa</p>
        <p className="text-muted-foreground text-xs">Workshop ERP</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.label as keyof typeof iconMap] ?? LayoutDashboard;
          const active =
            pathname === item.href || (item.label === 'Vehicle Task' && pathname === '/vehicles');
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
      <p className="text-muted-foreground px-2 text-xs">Phases 2–5 — Operations</p>
    </aside>
  );
}
