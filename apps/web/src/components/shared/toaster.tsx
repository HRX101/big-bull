'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, CircleAlert, CircleX, Info, Loader2 } from 'lucide-react';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      offset={16}
      mobileOffset={12}
      closeButton
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
        error: <CircleX className="h-4 w-4 text-red-500 dark:text-red-400" />,
        warning: <CircleAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
        info: <Info className="h-4 w-4 text-sky-500 dark:text-sky-400" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-sky-500 dark:text-sky-400" />,
      }}
      toastOptions={{
        style: {
          padding: '10px 12px',
          borderRadius: '10px',
        },
        classNames: {
          toast:
            'group toast !rounded-[10px] border bg-background text-foreground shadow-lg shadow-black/10 group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg dark:shadow-black/40',
          title: 'group-[.toast]:text-xs group-[.toast]:font-semibold',
          description:
            'group-[.toast]:text-[11px] group-[.toast]:text-muted-foreground group-[.toast]:mt-0 group-[.toast]:leading-snug',
          actionButton:
            'group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:px-2.5 group-[.toast]:py-1 group-[.toast]:text-[11px] group-[.toast]:font-medium group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90',
          cancelButton:
            'group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:px-2.5 group-[.toast]:py-1 group-[.toast]:text-[11px] group-[.toast]:font-medium group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80',
          closeButton:
            'group-[.toast]:absolute group-[.toast]:right-1.5 group-[.toast]:top-1/2 group-[.toast]:-translate-y-1/2 group-[.toast]:h-4 group-[.toast]:w-4 group-[.toast]:rounded-full group-[.toast]:border-0 group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground group-[.toast]:hover:scale-105 group-[.toast]:transition-transform [&>svg]:h-3 [&>svg]:w-3',
        },
      }}
    />
  );
}
