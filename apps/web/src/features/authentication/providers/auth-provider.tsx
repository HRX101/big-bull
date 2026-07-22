'use client';

import { authRepository } from '@car-spa/infrastructure';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';

const AUTH_COOKIE = 'car-spa-auth';

function setAuthCookie(isAuthenticated: boolean) {
  if (isAuthenticated) {
    document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const unsubscribe = authRepository.subscribe(async (session) => {
      if (!session) {
        setSession(null);
        setLoading(false);
        setAuthCookie(false);
        return;
      }

      const refreshed = await authRepository.refreshSession();
      setSession(refreshed ?? session);
      setLoading(false);
      setAuthCookie(true);
    });
    return unsubscribe;
  }, [setSession, setLoading]);

  return <>{children}</>;
}
