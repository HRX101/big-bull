'use client';

import { AUTH_ROUTES, PROTECTED_ROUTES } from '@car-spa/shared';
import { authRepository } from '@car-spa/infrastructure';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type ActionStatus = 'loading' | 'success' | 'error' | 'reset-form';

function resolveActionParams(searchParams: URLSearchParams) {
  let mode = searchParams.get('mode');
  let oobCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  if ((!mode || !oobCode) && continueUrl) {
    try {
      const nested = new URL(continueUrl);
      mode = mode ?? nested.searchParams.get('mode');
      oobCode = oobCode ?? nested.searchParams.get('oobCode');
    } catch {
      // ignore malformed continueUrl
    }
  }

  if (typeof window !== 'undefined' && (!mode || !oobCode)) {
    const browserParams = new URLSearchParams(window.location.search);
    mode = mode ?? browserParams.get('mode');
    oobCode = oobCode ?? browserParams.get('oobCode');
  }

  return { mode, oobCode, continueUrl };
}

export function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mode, oobCode, continueUrl } = useMemo(
    () => resolveActionParams(searchParams),
    [searchParams],
  );

  const [status, setStatus] = useState<ActionStatus>('loading');
  const [message, setMessage] = useState('');
  const [resolvedMode, setResolvedMode] = useState<string | null>(mode);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!oobCode) {
      setStatus('error');
      setMessage('This verification link is invalid or incomplete.');
      return;
    }

    let cancelled = false;

    async function runAction() {
      setStatus('loading');
      setMessage('');

      try {
        const operation = await authRepository.inspectActionCode(oobCode!);
        if (cancelled) return;

        switch (operation) {
          case 'VERIFY_EMAIL':
          case 'VERIFY_AND_CHANGE_EMAIL': {
            await authRepository.applyEmailVerification(oobCode!);
            if (cancelled) return;
            setResolvedMode('verifyEmail');
            setStatus('success');
            setMessage('Your email has been verified. You can continue to onboarding.');
            break;
          }
          case 'PASSWORD_RESET': {
            const email = await authRepository.verifyPasswordResetCode(oobCode!);
            if (cancelled) return;
            setResolvedMode('resetPassword');
            setResetEmail(email);
            setStatus('reset-form');
            break;
          }
          case 'RECOVER_EMAIL': {
            await authRepository.applyEmailVerification(oobCode!);
            if (cancelled) return;
            setResolvedMode('recoverEmail');
            setStatus('success');
            setMessage('Your email address has been restored.');
            break;
          }
          default:
            setStatus('error');
            setMessage(`This link action (${operation}) is not supported yet.`);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'This link is invalid or has expired.');
      }
    }

    void runAction();

    return () => {
      cancelled = true;
    };
  }, [oobCode, mode]);

  async function handlePasswordReset(event: React.FormEvent) {
    event.preventDefault();
    if (!oobCode) return;
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      await authRepository.confirmPasswordReset(oobCode, newPassword);
      setStatus('success');
      setMessage('Your password has been reset. You can sign in with your new password.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reset password.');
    }
  }

  if (status === 'loading') {
    return (
      <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
        <CardHeader>
          <CardTitle>Processing request</CardTitle>
          <CardDescription>Please wait while we verify your link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'reset-form') {
    return (
      <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Choose a new password for {resetEmail}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {message && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full">
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/80 w-full max-w-md backdrop-blur">
      <CardHeader>
        <CardTitle>{status === 'success' ? 'Success' : 'Error encountered'}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'success' && resolvedMode === 'verifyEmail' && (
          <Button
            className="w-full"
            onClick={() => router.push(continueUrl ?? AUTH_ROUTES.onboarding)}
          >
            Continue
          </Button>
        )}
        {status === 'success' && resolvedMode === 'resetPassword' && (
          <Button asChild className="w-full">
            <Link href={AUTH_ROUTES.signIn}>Sign in</Link>
          </Button>
        )}
        {status === 'error' && (
          <Button asChild variant="outline" className="w-full">
            <Link href={AUTH_ROUTES.signIn}>Back to sign in</Link>
          </Button>
        )}
        {status === 'success' &&
          resolvedMode !== 'verifyEmail' &&
          resolvedMode !== 'resetPassword' && (
            <Button asChild className="w-full">
              <Link href={PROTECTED_ROUTES.dashboard}>Go to dashboard</Link>
            </Button>
          )}
      </CardContent>
    </Card>
  );
}
