'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@car-spa/domain';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { useSignIn } from '@/features/authentication/hooks/use-auth-mutations';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { PasswordInput } from './password-input';

export function SignInForm() {
  const router = useRouter();
  const signIn = useSignIn();
  const session = useAuthStore((s) => s.session);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signInSchema) });

  useEffect(() => {
    if (session) router.push(PROTECTED_ROUTES.dashboard);
  }, [session, router]);

  const onSubmit = handleSubmit(async (data) => {
    const result = await signIn.mutateAsync(data);
    if (result.success) router.push(PROTECTED_ROUTES.dashboard);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-zinc-800">
          Email<span className="font-normal text-zinc-400">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          className="w-full rounded-lg border-[1.5px] border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-150 outline-none focus:border-blue-600 focus:bg-white focus:ring-[3px] focus:ring-blue-600/15"
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1.5 text-[12.5px] font-medium text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-zinc-800">
          Password<span className="font-normal text-zinc-400">*</span>
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          {...register('password')}
        />
        {errors.password && (
          <p className="mt-1.5 text-[12.5px] font-medium text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Server error */}
      {signIn.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-[11px] text-[13px] font-medium text-red-600">
          {signIn.error.message}
        </div>
      )}

      {/* Sign In Button */}
      <button
        type="submit"
        disabled={signIn.isPending}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-[11px] text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {signIn.isPending ? (
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
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
