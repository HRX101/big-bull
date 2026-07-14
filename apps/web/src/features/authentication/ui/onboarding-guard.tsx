'use client';

import { hasOrgContext } from '@car-spa/domain';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !session) return;
    if (hasOrgContext(session)) {
      router.replace(PROTECTED_ROUTES.dashboard);
    }
  }, [session, loading, router]);

  if (loading || !session || hasOrgContext(session)) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    );
  }

  return <>{children}</>;
}
