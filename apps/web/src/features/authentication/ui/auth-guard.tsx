'use client';

import { AUTH_ROUTES } from '@car-spa/shared';
import { requiresOnboarding } from '@car-spa/domain';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(AUTH_ROUTES.signIn);
      return;
    }
    if (!session.emailVerified) {
      router.replace(AUTH_ROUTES.verifyEmail);
      return;
    }
    if (requiresOnboarding(session)) {
      router.replace(AUTH_ROUTES.onboarding);
    }
  }, [session, loading, router]);

  if (loading || !session || !session.emailVerified || requiresOnboarding(session)) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-4 sm:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
