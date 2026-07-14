import { Suspense } from 'react';
import { AuthActionHandler } from '@/features/authentication/ui/auth-action-handler';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthActionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <AuthActionHandler />
      </Suspense>
    </main>
  );
}
