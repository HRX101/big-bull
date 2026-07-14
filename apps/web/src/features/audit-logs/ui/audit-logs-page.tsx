'use client';

import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useAuditLogs } from '@/hooks/use-operations';

export function AuditLogsPage() {
  const { data: logs = [], isLoading, error } = useAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable record of actions across the workshop."
      />
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {error && <p className="text-destructive text-sm">{error.message}</p>}
      <DataTable
        headers={['Time', 'Action', 'Resource', 'Actor']}
        rows={logs.map((log) => [
          log.createdAt.toLocaleString(),
          log.action,
          `${log.resourceType}:${log.resourceId.slice(0, 8)}`,
          log.actorId.slice(0, 8),
        ])}
      />
    </div>
  );
}
