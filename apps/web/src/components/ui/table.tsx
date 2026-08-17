import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-muted/40 [&_tr]:border-b', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-muted-foreground h-11 px-4 text-left align-middle text-[10px] font-bold tracking-wider uppercase [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('p-3.5 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
  );
}
