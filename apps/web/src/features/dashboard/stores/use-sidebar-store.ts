'use client';

import { create } from 'zustand';

interface SidebarState {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  mobileOpen: false,
  setMobileOpen: (open) => set({ mobileOpen: open }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
  collapsed: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
}));
