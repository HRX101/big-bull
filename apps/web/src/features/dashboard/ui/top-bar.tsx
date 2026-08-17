'use client';

import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebarStore } from '@/features/dashboard/stores/use-sidebar-store';
import { ThemeToggle } from '@/features/dashboard/ui/theme-toggle';
import { ProfileMenu } from '@/features/dashboard/ui/profile-menu';
import { BrandLogo } from '@/components/shared/brand-logo';
import { cn } from '@/lib/utils';

const iconButtonClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50';

export function TopBar() {
  const { toggleMobile, collapsed, toggleCollapsed } = useSidebarStore();

  return (
    <>
      <header className="from-navy-light to-navy dark:from-navy-darker dark:to-navy-dark z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            aria-label="Open navigation menu"
            className={cn(iconButtonClass, 'lg:hidden')}
            onClick={() => toggleMobile()}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(iconButtonClass, 'hidden lg:inline-flex')}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <span className="hidden md:block lg:hidden">
            <BrandLogo className="h-7 w-7 rounded-md" />
          </span>
          <span className="hidden text-[10px] font-bold tracking-wider text-slate-500 uppercase lg:block">
            Workspace
          </span>
          <span className="max-w-[130px] truncate rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-100 sm:max-w-none">
            {process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? 'Big Bull Car Spa'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>
    </>
  );
}
