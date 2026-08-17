import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-4', className)}>
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/30">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-primary mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {eyebrow}
            </p>
          )}
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-[26px]">
            {title}
          </h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
      </div>
      {action && (
        <div className="flex w-full shrink-0 items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}
