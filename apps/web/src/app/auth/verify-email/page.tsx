'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRepository } from '@car-spa/infrastructure';
import { AUTH_ROUTES } from '@car-spa/shared';
import { AuthLayout } from '@/features/authentication/ui/auth-layout';
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
    setMessage(
      'Your email is not verified yet. Check your inbox and click the verification link, then try again.',
    );
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
      setMessage('Verification email sent. Check your inbox.');
    } catch {
      setMessage('Could not send the verification email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      heading="Verify your email"
      subtitle="Confirm your inbox to continue to workshop setup."
    >
      <div className="flex flex-col gap-4">
        {/* Email icon */}
        <div className="mb-1 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
          </div>
        </div>

        <p className="text-center text-[13.5px] leading-[1.65] text-zinc-500">
          We sent a verification link to your inbox. Please verify before continuing to workshop
          setup.
        </p>

        {message && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-[11px] text-[13px] leading-relaxed font-medium text-blue-700">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={checkVerification}
          disabled={checking}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-[11px] text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {checking ? (
            <>
              <svg
                className="h-[15px] w-[15px] shrink-0 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Checking...
            </>
          ) : (
            'I have verified my email'
          )}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-zinc-200 bg-white px-4 py-[11px] text-[13.5px] font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {resending ? (
            <>
              <svg
                className="h-[15px] w-[15px] shrink-0 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </>
          ) : (
            'Resend verification email'
          )}
        </button>
      </div>
    </AuthLayout>
  );
}
