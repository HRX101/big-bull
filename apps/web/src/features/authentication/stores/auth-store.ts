'use client';

import { create } from 'zustand';
import type { AuthSession } from '@car-spa/domain';

interface AuthState {
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
}));
