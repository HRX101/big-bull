'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/features/authentication/hooks/use-auth-mutations';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { PROTECTED_ROUTES } from '@car-spa/shared';

export function TopBar() {
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();

  return (
    <header className="border-border/60 flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">Organization</span>
        <span className="border-border rounded-md border px-2 py-1 text-sm">
          {process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? 'Big Bull Car Spa'}
        </span>
      </div>
      <div className="flex items-center gap-2">
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
        <div className="border-border flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
          <User className="text-muted-foreground h-4 w-4" />
          <span>{session?.displayName}</span>
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
