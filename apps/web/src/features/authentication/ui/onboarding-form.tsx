'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { bootstrapOrgSchema } from '@car-spa/domain';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { useBootstrapOrg } from '@/features/authentication/hooks/use-auth-mutations';
import { AuthLayout } from './auth-layout';

export function OnboardingForm() {
  const router = useRouter();
  const bootstrap = useBootstrapOrg();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bootstrapOrgSchema),
    defaultValues: { orgName: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? 'Big Bull Car Spa' },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await bootstrap.mutateAsync(data);
    if (result.success) router.push(PROTECTED_ROUTES.dashboard);
  });

  const errorMessage =
    bootstrap.error?.message ??
    (!bootstrap.data?.success && bootstrap.data ? bootstrap.data.error.message : null);

  return (
    <AuthLayout
      heading="Set up your workshop"
      subtitle="Create your default organization to get started."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {/* Workshop name */}
        <div>
          <label
            htmlFor="orgName"
            className="mb-1.5 block text-[13px] font-semibold text-slate-800"
          >
            Workshop name<span className="font-normal text-zinc-400">*</span>
          </label>
          <input
            id="orgName"
            autoComplete="organization"
            placeholder="Enter your workshop name"
            className="w-full rounded-lg border-[1.5px] border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all duration-150 outline-none focus:border-blue-600 focus:bg-white focus:ring-[3px] focus:ring-blue-600/15"
            {...register('orgName')}
          />
          {errors.orgName && (
            <p className="mt-1.5 text-[12.5px] font-medium text-red-600">
              {errors.orgName.message}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-[11px] text-[13px] font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={bootstrap.isPending}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-[11px] text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {bootstrap.isPending ? (
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
              Setting up...
            </>
          ) : (
            'Continue to dashboard'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
