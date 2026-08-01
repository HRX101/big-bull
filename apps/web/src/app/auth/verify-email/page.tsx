'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRepository } from '@car-spa/infrastructure';
import { AUTH_ROUTES } from '@car-spa/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/features/authentication/stores/auth-store';

export default function VerifyEmailPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [checking, setChecking] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkVerification = useCallback(async () => {
    setChecking(true);
    setMessage(null);
    const refreshed = await authRepository.refreshSession();
    if (refreshed) setSession(refreshed);
    if (!refreshed) {
      router.replace(AUTH_ROUTES.signIn);
      return;
    }
    if (refreshed.emailVerified) {
      router.replace(AUTH_ROUTES.onboarding);
      return;
    }
    setMessage('Your email is not verified yet. Check your inbox (or the emulator email outbox) and click the verification link, then try again.');
    setChecking(false);
  }, [router, setSession]);

  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  async function handleResend() {
    setResending(true);
    setMessage(null);
    try {
      await authRepository.sendEmailVerification();
      setMessage('Verification email sent. Check your inbox (or the emulator email outbox).');
    } catch {
      setMessage('Could not send the verification email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to your inbox. Please verify before continuing to
            onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && <p className="text-muted-foreground text-sm">{message}</p>}
          <Button className="w-full" onClick={checkVerification} disabled={checking}>
            {checking ? 'Checking…' : 'I have verified my email'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Resend verification email'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
