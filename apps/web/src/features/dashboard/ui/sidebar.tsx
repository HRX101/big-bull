'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  Car,
  Package,
  ShoppingCart,
  Users,
  UsersRound,
  Wrench,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROTECTED_ROUTES, hasPermission } from '@car-spa/shared';
import { useAuth } from '@/features/authentication/hooks/use-auth';

const allNavItems = [
  { href: PROTECTED_ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { href: PROTECTED_ROUTES.vehicleTasks, label: 'Vehicle Tasks', icon: Car },
  { href: PROTECTED_ROUTES.inventory, label: 'Inventory', icon: Package },
  { href: PROTECTED_ROUTES.suppliers, label: 'Suppliers', icon: Truck },
  { href: PROTECTED_ROUTES.pos, label: 'POS', icon: ShoppingCart },
  { href: PROTECTED_ROUTES.customers, label: 'Customers', icon: Users },
  { href: PROTECTED_ROUTES.employees, label: 'Employees', icon: UsersRound },
  { href: PROTECTED_ROUTES.mechanics, label: 'Mechanics', icon: Wrench },
  { href: PROTECTED_ROUTES.settings, label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const role = session?.role ?? 'employee';

  const navItems = allNavItems.filter((item) => {
    if (item.href === PROTECTED_ROUTES.employees) {
      return hasPermission(role, 'employee:read');
    }
    if (item.href === PROTECTED_ROUTES.mechanics) {
      return hasPermission(role, 'mechanic:read');
    }
    if (item.href === PROTECTED_ROUTES.suppliers) {
      return hasPermission(role, 'supplier:read');
    }
    return true;
  });

  return (
    <aside className="border-border/60 bg-card/40 flex w-60 flex-col border-r p-4">
      <div className="mb-8 px-2">
        <p className="font-display text-2xl tracking-tight">Big Bull Car Spa</p>
        <p className="text-muted-foreground text-xs">Powered by Nexarise</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const label =
            item.href === PROTECTED_ROUTES.employees && role !== 'owner'
              ? 'My Portal'
              : item.label;
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
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
