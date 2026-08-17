'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from '@/components/shared/toaster';
import { AuthProvider } from '@/features/authentication/providers/auth-provider';
import { FirebaseProvider } from '@/providers/firebase-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider>
          <AuthProvider>{children}</AuthProvider>
        </FirebaseProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
