import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, className, action }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {action}
    </div>
  );
}
