import type { StatusChangeNotificationTemplate } from '@car-spa/domain';
import type { Result } from '@car-spa/shared';

export interface WhatsAppMessagePayload {
  toNumber: string;
  templateName?: string;
  params: Record<string, string>;
  rawText?: string;
}

export interface IWhatsAppProvider {
  send(payload: WhatsAppMessagePayload): Promise<Result<{ providerMessageId: string }>>;
}

export interface WhatsAppLogEntry {
  storeId: string;
  taskId: string | null;
  toNumber: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  providerMessageId: string | null;
  error: string | null;
  attemptCount: number;
  createdAt: Date;
}

export interface WhatsAppLogRepository {
  create(entry: WhatsAppLogEntry): Promise<void>;
}

export interface WhatsAppDedupeRepository {
  acquire(key: string): Promise<boolean>;
}

export interface NotificationTemplateRepository {
  findByOrgId(orgId: string): Promise<StatusChangeNotificationTemplate | null>;
  upsert(
    data: Omit<StatusChangeNotificationTemplate, 'updatedAt'> & { updatedAt?: Date },
  ): Promise<StatusChangeNotificationTemplate>;
}
