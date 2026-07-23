import { cn } from '@/lib/utils';

export function DataTable({
  headers,
  rows,
  emptyMessage = 'No records yet.',
  className,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>;
  }

  return (
    <div className={cn('border-border/60 overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {headers.map((header, index) => (
              <th key={`${index}-${header}`} className="px-4 py-3 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-border/40 border-t">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
