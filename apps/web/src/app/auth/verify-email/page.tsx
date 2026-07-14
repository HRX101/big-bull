'use client';

import { AUTH_ROUTES } from '@car-spa/shared';
import { authRepository } from '@car-spa/infrastructure';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/authentication/hooks/use-auth';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (searchParams.get('oobCode') && searchParams.get('mode')) {
      const query = searchParams.toString();
      router.replace(`${AUTH_ROUTES.authAction}?${query}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace(AUTH_ROUTES.signIn);
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError(null);
    setMessage(null);

    try {
      await authRepository.sendEmailVerification();
      setMessage('Verification email sent. Check your inbox and spam folder.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to resend verification email.';
      setError(text);
      if (text.toLowerCase().includes('too many attempts')) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setResendLoading(false);
    }
  }

  async function handleCheckVerified() {
    setCheckLoading(true);
    setError(null);
    setMessage(null);

    try {
      const refreshed = await authRepository.refreshSession();
      if (refreshed?.emailVerified) {
        router.push(AUTH_ROUTES.onboarding);
        return;
      }
      setMessage('Email not verified yet. Open the link in your inbox, then try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh your session.');
    } finally {
      setCheckLoading(false);
    }
  }

  if (loading || !session) {
    return null;
  }

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link to {session.email}. Open the link to verify your account
          before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button className="w-full" disabled={checkLoading} onClick={() => void handleCheckVerified()}>
          {checkLoading ? 'Checking…' : 'I have verified my email'}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={resendLoading || cooldown > 0}
          onClick={() => void handleResend()}
        >
          {resendLoading
            ? 'Sending…'
            : cooldown > 0
              ? `Resend available in ${cooldown}s`
              : 'Resend verification email'}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Verification links are generated for this app&apos;s current URL automatically.
        </p>
        <Link
          href={AUTH_ROUTES.signIn}
          className="text-muted-foreground block text-center text-sm hover:text-foreground"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
