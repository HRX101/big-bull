'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageSquare, Save } from 'lucide-react';
import {
  getNotificationTemplateUseCase,
  updateNotificationTemplateUseCase,
} from '@car-spa/infrastructure';
import {
  DEFAULT_STATUS_CHANGE_TEMPLATE,
  NOTIFICATION_PLACEHOLDERS,
  SAMPLE_TEMPLATE_VALUES,
  renderTemplate,
  validateTemplateTokens,
} from '@car-spa/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function NotificationTemplateCard({
  orgId,
  actorId,
  canEdit,
}: {
  orgId: string;
  actorId: string;
  canEdit: boolean;
}) {
  const [template, setTemplate] = useState(DEFAULT_STATUS_CHANGE_TEMPLATE);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['notificationTemplate', orgId],
    queryFn: async () => {
      const existing = await getNotificationTemplateUseCase.execute(orgId);
      if (existing) setTemplate(existing.messageTemplate);
      return existing;
    },
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateNotificationTemplateUseCase.execute(
        { storeId: orgId, messageTemplate: template },
        actorId,
      ),
    onSuccess: (result) => {
      if (result.success) {
        setSaved(true);
        setError(null);
      } else {
        setError(result.error.message);
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const tokenCheck = validateTemplateTokens(template);
  const preview = renderTemplate(template, SAMPLE_TEMPLATE_VALUES);
  const dirty = template !== DEFAULT_STATUS_CHANGE_TEMPLATE;

  const insertPlaceholder = (placeholder: (typeof NOTIFICATION_PLACEHOLDERS)[number]) => {
    setSaved(false);
    setTemplate((current) => `${current}{{${placeholder}}}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="text-muted-foreground h-5 w-5" />
          <CardTitle>WhatsApp Notification Template</CardTitle>
        </div>
        <CardDescription>
          Message sent to the owner and the customer when a vehicle task status changes. Only the
          store owner can edit it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading template…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="messageTemplate">Message template</Label>
              <textarea
                id="messageTemplate"
                value={template}
                disabled={!canEdit}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {!tokenCheck.valid && (
                <p className="text-destructive text-sm">
                  Unknown placeholder{tokenCheck.unsupported.length > 1 ? 's' : ''}{' '}
                  {tokenCheck.unsupported.map((t) => `{{${t}}}`).join(', ')}. Supported:{' '}
                  {NOTIFICATION_PLACEHOLDERS.map((p) => `{{${p}}}`).join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Placeholders</Label>
              <p className="text-muted-foreground text-xs">
                Click a placeholder to append it to the template.
              </p>
              <div className="flex flex-wrap gap-2">
                {NOTIFICATION_PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => insertPlaceholder(p)}
                    className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded px-2 py-1 font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {'{{'}
                    {p}
                    {'}}'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Live preview</Label>
              <div className="bg-muted/50 rounded-md border p-3 text-sm whitespace-pre-wrap">
                {preview}
              </div>
            </div>

            {saved && <p className="text-sm text-emerald-600">Template saved.</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}

            {canEdit && (
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  void mutation.mutate();
                }}
                disabled={mutation.isPending || !dirty || !tokenCheck.valid || !template.trim()}
              >
                <Save className="h-4 w-4" />
                {mutation.isPending ? 'Saving…' : 'Save template'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
