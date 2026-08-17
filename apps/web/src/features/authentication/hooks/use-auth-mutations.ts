'use client';

import {
  bootstrapDefaultOrgUseCase,
  signInUseCase,
  signUpUseCase,
  authRepository,
} from '@car-spa/infrastructure';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';

export function useSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: unknown) => signInUseCase.execute(input),
    onSuccess: (result) => {
      if (result.success) setSession(result.value);
    },
  });
}

export function useSignUp() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: unknown) => signUpUseCase.execute(input),
    onSuccess: (result) => {
      if (result.success) setSession(result.value);
    },
  });
}

export function useGoogleSignIn() {
  return useMutation({
    mutationFn: () => authRepository.signInWithGoogle(),
  });
}

export function useGoogleRedirectResult() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: () => authRepository.getRedirectResult(),
    onSuccess: (session) => {
      if (session) setSession(session);
    },
  });
}

export function useSignOut() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: () => authRepository.signOut(),
    onSuccess: () => setSession(null),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authRepository.sendPasswordReset(email),
  });
}

export function useBootstrapOrg() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: unknown) => bootstrapDefaultOrgUseCase.execute(input),
    onSuccess: async (result) => {
      if (result.success) {
        const refreshed = await authRepository.refreshSession();
        setSession(refreshed ?? result.value);
      }
    },
  });
}
