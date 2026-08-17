'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AUTH_ROUTES } from '@car-spa/shared';
import { AuthLayout } from './auth-layout';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

type AuthMode = 'sign-in' | 'sign-up';

const COPY: Record<AuthMode, { heading: string; subtitle: string }> = {
  'sign-in': {
    heading: 'Sign in to your account',
    subtitle: 'Enter your credentials to access your workspace.',
  },
  'sign-up': {
    heading: 'Create your account',
    subtitle: 'Start managing your automotive workshop in minutes.',
  },
};

export function AuthShell({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [active, setActive] = useState<AuthMode>(mode);

  const switchTo = (next: AuthMode) => {
    if (next === active) return;
    setActive(next);
    router.replace(next === 'sign-in' ? AUTH_ROUTES.signIn : AUTH_ROUTES.signUp);
  };

  return (
    <AuthLayout heading={COPY[active].heading} subtitle={COPY[active].subtitle}>
      {/* Mode switch */}
      <div className="relative mb-6 grid grid-cols-2 rounded-lg border-[1.5px] border-zinc-200 bg-zinc-50 p-1">
        {(['sign-in', 'sign-up'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTo(tab)}
            className="relative z-10 cursor-pointer rounded-md py-2 text-[13px] font-semibold transition-colors duration-150"
          >
            <span className={active === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'}>
              {tab === 'sign-in' ? 'Sign in' : 'Create account'}
            </span>
            {active === tab && (
              <motion.span
                layoutId="auth-tab-indicator"
                className="absolute inset-0 -z-10 rounded-md bg-blue-600"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {active === 'sign-in' ? <SignInForm /> : <SignUpForm />}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}
