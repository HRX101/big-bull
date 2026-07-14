'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useMarkNotificationRead, useNotifications } from '@/hooks/use-operations';

export function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="In-app alerts and task updates." />
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Title', 'Message', 'Type', 'Status', 'Actions']}
        rows={notifications.map((n) => [
          n.title,
          n.body,
          <Badge key={`${n.id}-t`}>{n.type}</Badge>,
          n.read ? (
            <Badge key={`${n.id}-r`} variant="outline">
              Read
            </Badge>
          ) : (
            <Badge key={`${n.id}-r`} variant="warning">
              Unread
            </Badge>
          ),
          !n.read ? (
            <Button
              key={`${n.id}-a`}
              size="sm"
              variant="outline"
              onClick={() => markRead.mutate(n.id)}
            >
              Mark read
            </Button>
          ) : (
            '—'
          ),
        ])}
      />
    </div>
  );
}
