'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROTECTED_ROUTES, hasPermission } from '@car-spa/shared';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { useSidebarStore } from '@/features/dashboard/stores/use-sidebar-store';
import { BrandLogo } from '@/components/shared/brand-logo';

const allNavItems: { href: string; label: string; icon: LucideIcon }[] = [
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

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const role = session?.role ?? 'employee';
  const { setMobileOpen, toggleCollapsed } = useSidebarStore();

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
    <>
      <div
        className={cn(
          'mb-6 flex h-10 items-center gap-2.5 px-2',
          collapsed && 'justify-center px-0',
        )}
      >
        <BrandLogo className="h-10 w-10 shrink-0 rounded-lg shadow-md shadow-black/20" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-bold tracking-tight text-white">
              Big Bull Car Spa
            </p>
            <p className="text-[9px] font-medium tracking-widest text-slate-400 uppercase">
              Powered by Nexarise
            </p>
          </div>
        )}
      </div>

      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          Main Menu
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const label =
            item.href === PROTECTED_ROUTES.employees && role !== 'owner' ? 'My Portal' : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-sky-500/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <span
                className={cn(
                  'absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity',
                  active ? 'bg-sky-400 opacity-100' : 'opacity-0',
                )}
                aria-hidden="true"
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-sky-400' : 'text-slate-500 group-hover:text-white',
                )}
              />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen, collapsed } = useSidebarStore();

  useEffect(() => {
    if (mobileOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      function handleEscape(e: KeyboardEvent) {
        if (e.key === 'Escape') setMobileOpen(false);
      }
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = previous;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        className={cn(
          'from-navy-light to-navy dark:from-navy-darker dark:to-navy-dark hidden shrink-0 flex-col border-r border-white/5 bg-gradient-to-b p-4 transition-[width] duration-300 ease-in-out lg:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="from-navy-light to-navy dark:from-navy-darker dark:to-navy-dark relative flex h-full w-64 max-w-[85vw] flex-col overflow-y-auto border-r border-white/5 bg-gradient-to-b p-4">
            <SidebarContent collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
