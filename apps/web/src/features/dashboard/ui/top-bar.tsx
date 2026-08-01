'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut, Settings, User, Menu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/features/authentication/hooks/use-auth-mutations';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { useSidebarStore } from '@/features/dashboard/stores/use-sidebar-store';
import { PROTECTED_ROUTES } from '@car-spa/shared';

export function TopBar() {
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();
  const { toggleMobile } = useSidebarStore();

  return (
    <header className="border-border/60 flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          className="lg:hidden"
          onClick={() => toggleMobile()}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-muted-foreground hidden text-sm md:block">Organization</span>
        <span className="border-border truncate rounded-md border px-2 py-1 text-sm">
          {process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? 'Big Bull Car Spa'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Settings">
          <Link href={PROTECTED_ROUTES.settings}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <div className="border-border hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm sm:flex">
          <User className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="max-w-[120px] truncate">{session?.displayName}</span>
          <span className="text-muted-foreground">({session?.role})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
