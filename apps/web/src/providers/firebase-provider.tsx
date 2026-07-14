'use client';

import { initAnalytics, initAppCheck, initPerformance } from '@car-spa/infrastructure';
import { useEffect } from 'react';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAppCheck();
    void initAnalytics();
    initPerformance();
  }, []);

  return <>{children}</>;
}
