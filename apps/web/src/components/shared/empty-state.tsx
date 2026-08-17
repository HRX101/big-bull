import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, className, action, icon }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="bg-muted/60 text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {action}
    </div>
  );
}
