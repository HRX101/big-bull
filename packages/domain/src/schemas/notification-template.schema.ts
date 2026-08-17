import { z } from 'zod';
import {
  NOTIFICATION_PLACEHOLDERS,
  type NotificationPlaceholder,
} from '../entities/notification-template.entity';

export const statusChangeTemplateSchema = z
  .object({
    storeId: z.string().min(1),
    messageTemplate: z.string().min(1, 'Message template is required'),
    placeholders: z
      .array(z.enum(NOTIFICATION_PLACEHOLDERS))
      .default([...NOTIFICATION_PLACEHOLDERS]),
    updatedAt: z.date(),
    updatedBy: z.string().min(1),
  })
  .superRefine(statusChangeTemplateRefine);

export const updateStatusChangeTemplateSchema = z
  .object({
    storeId: z.string().min(1),
    messageTemplate: z.string().min(1, 'Message template is required'),
    updatedBy: z.string().min(1),
  })
  .superRefine(statusChangeTemplateRefine);

function statusChangeTemplateRefine(data: { messageTemplate: string }, ctx: z.RefinementCtx): void {
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const tokens = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(data.messageTemplate)) !== null) {
    tokens.add(match[1]!);
  }

  const supported = new Set<string>(NOTIFICATION_PLACEHOLDERS as readonly string[]);
  for (const token of tokens) {
    if (!supported.has(token)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['messageTemplate'],
        message: `Unknown placeholder "{{${token}}}". Supported: ${NOTIFICATION_PLACEHOLDERS.join(', ')}`,
      });
    }
  }

  if (tokens.size === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['messageTemplate'],
      message: 'Template must contain at least one placeholder',
    });
  }
}

export type StatusChangeTemplateInput = z.infer<typeof statusChangeTemplateSchema>;
export type UpdateStatusChangeTemplateInput = z.infer<typeof updateStatusChangeTemplateSchema>;

export function validateTemplateTokens(
  template: string,
): { valid: true } | { valid: false; unsupported: string[] } {
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const tokens = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(template)) !== null) {
    tokens.add(match[1]!);
  }

  const supported = new Set<string>(NOTIFICATION_PLACEHOLDERS as readonly string[]);
  const unsupported = [...tokens].filter((t) => !supported.has(t));
  return unsupported.length === 0 ? { valid: true } : { valid: false, unsupported };
}

export type { NotificationPlaceholder };
