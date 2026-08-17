'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { useSignOut } from '@/features/authentication/hooks/use-auth-mutations';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const contentClass =
  'z-50 min-w-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-black/20 dark:border-slate-700/60 dark:bg-slate-900 dropdown-in';

const itemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors data-[highlighted]:bg-slate-100 focus:outline-none dark:data-[highlighted]:bg-slate-800';

export function ProfileMenu() {
  const { session } = useAuth();
  const signOut = useSignOut();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const name = session?.displayName || 'User';
  const email = session?.email || '';
  const role = session?.role;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Open profile menu"
            className="group flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1.5 pr-2 pl-1.5 text-sm transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none data-[state=open]:border-sky-300/40 data-[state=open]:bg-white/10"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/25 text-[11px] font-bold text-sky-300 dark:bg-sky-400/20 dark:text-sky-300">
              {initials(name)}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[110px] truncate font-medium text-white">{name}</span>
              <span className="block text-[10px] font-medium tracking-wide text-slate-400 capitalize">
                {role ?? 'Pending'}
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className={contentClass} align="end" sideOffset={8}>
            <DropdownMenu.Label className="px-2 pt-2 pb-1.5 focus:outline-none">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30">
                  {initials(name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{email}</p>
                  {role && (
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                        role === 'owner'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                      )}
                    >
                      {role}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenu.Label>

            <DropdownMenu.Separator className="my-1.5 h-px bg-slate-200 dark:bg-slate-700/60" />

            <DropdownMenu.Group>
              <DropdownMenu.Item
                asChild
                className={cn(itemClass, 'text-slate-700 dark:text-slate-200')}
              >
                <Link href={PROTECTED_ROUTES.settings}>
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Group>

            <DropdownMenu.Separator className="my-1.5 h-px bg-slate-200 dark:bg-slate-700/60" />

            <DropdownMenu.Item
              className={cn(
                itemClass,
                'text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 dark:text-red-400 dark:data-[highlighted]:bg-red-950/40 dark:data-[highlighted]:text-red-300',
              )}
              onSelect={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut.mutate()}
        title="Sign out?"
        description="Are you sure you want to sign out of Big Bull Car Spa? You'll need to sign in again to continue."
        confirmLabel="Sign out"
        cancelLabel="Stay"
        variant="destructive"
        icon={LogOut}
        loading={signOut.isPending}
      />
    </>
  );
}
