import {
  DEFAULT_STATUS_CHANGE_TEMPLATE,
  renderTemplate,
  type NotificationTemplateValues,
  type StatusChangeNotificationTemplate,
} from '@car-spa/domain';
import { ok, type Result } from '@car-spa/shared';
import type {
  IWhatsAppProvider,
  NotificationTemplateRepository,
  WhatsAppDedupeRepository,
  WhatsAppLogEntry,
  WhatsAppLogRepository,
} from '../ports/whatsapp-provider.port';

export interface WhatsAppServiceConfig {
  defaultCountryCode: string;
  templateCacheTtlMs?: number;
}

export interface StatusChangeNotificationInput {
  storeId: string;
  taskId: string;
  status: string;
  storeName: string;
  ownerNumber: string | null;
  customerNumber: string | null;
  customerName: string | null;
  vehicleNumber: string | null;
  amountDue?: number;
}

export interface StatusChangeNotificationResult {
  sent: number;
  failed: number;
  skipped: number;
}

const DEFAULT_TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

export function normalizeWhatsAppPhone(phone: string, defaultCountryCode: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = normalized.slice(1);
  if (normalized.length === 10) normalized = `${defaultCountryCode}${normalized}`;
  if (normalized.length === 12 && normalized.startsWith(defaultCountryCode)) {
    return `+${normalized}`;
  }
  if (normalized.length >= 11 && normalized.length <= 15) {
    return `+${normalized}`;
  }
  return '';
}

export function buildDedupeKey(taskId: string, status: string, toNumber: string): string {
  return `${taskId}|${status}|${toNumber}`;
}

export class WhatsAppService {
  private readonly templateCache = new Map<
    string,
    { template: StatusChangeNotificationTemplate; expiresAt: number }
  >();

  constructor(
    private readonly provider: IWhatsAppProvider,
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly logRepo: WhatsAppLogRepository,
    private readonly dedupeRepo: WhatsAppDedupeRepository,
    private readonly config: WhatsAppServiceConfig,
  ) {}

  async getTemplate(storeId: string): Promise<StatusChangeNotificationTemplate> {
    const cached = this.templateCache.get(storeId);
    const ttlMs = this.config.templateCacheTtlMs ?? DEFAULT_TEMPLATE_CACHE_TTL_MS;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.template;
    }

    const stored = await this.templateRepo.findByOrgId(storeId);
    const template: StatusChangeNotificationTemplate =
      stored ??
      ({
        storeId,
        messageTemplate: DEFAULT_STATUS_CHANGE_TEMPLATE,
        placeholders: [],
        updatedBy: 'system',
        updatedAt: new Date(),
      } as StatusChangeNotificationTemplate);

    this.templateCache.set(storeId, { template, expiresAt: Date.now() + ttlMs });
    return template;
  }

  clearTemplateCache(storeId?: string): void {
    if (storeId) this.templateCache.delete(storeId);
    else this.templateCache.clear();
  }

  async notifyStatusChange(
    input: StatusChangeNotificationInput,
  ): Promise<Result<StatusChangeNotificationResult>> {
    const template = await this.getTemplate(input.storeId);

    const values: NotificationTemplateValues = {
      customerName: input.customerName ?? 'Customer',
      vehicleNumber: input.vehicleNumber ?? 'your vehicle',
      status: input.status,
      storeName: input.storeName,
      taskId: input.taskId,
      amountDue:
        input.amountDue !== undefined ? `₹${input.amountDue.toLocaleString('en-IN')}` : '₹0',
    };
    const message = renderTemplate(template.messageTemplate, values);

    const recipients = new Set<string>();
    for (const phone of [input.ownerNumber, input.customerNumber]) {
      if (!phone) continue;
      const normalized = normalizeWhatsAppPhone(phone, this.config.defaultCountryCode);
      if (normalized) recipients.add(normalized);
    }

    const result: StatusChangeNotificationResult = { sent: 0, failed: 0, skipped: 0 };

    for (const toNumber of recipients) {
      const outcome = await this.sendToRecipient({
        storeId: input.storeId,
        taskId: input.taskId,
        status: input.status,
        toNumber,
        message,
        params: values,
      });
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'failed') result.failed += 1;
      else result.skipped += 1;
    }

    return ok(result);
  }

  async sendToRecipient(input: {
    storeId: string;
    taskId: string;
    status: string;
    toNumber: string;
    message: string;
    params?: NotificationTemplateValues;
    templateName?: string;
  }): Promise<'sent' | 'failed' | 'skipped'> {
    const dedupeKey = buildDedupeKey(input.taskId, input.status, input.toNumber);
    const acquired = await this.dedupeRepo.acquire(dedupeKey);
    if (!acquired) {
      await this.writeLog({
        storeId: input.storeId,
        taskId: input.taskId,
        toNumber: input.toNumber,
        status: 'SKIPPED',
        providerMessageId: null,
        error: 'Duplicate notification attempt (dedupe key already exists)',
        attemptCount: 0,
      });
      return 'skipped';
    }

    const sendResult = await this.provider.send({
      toNumber: input.toNumber,
      templateName: input.templateName,
      params: input.params ?? {},
      rawText: input.message,
    });

    if (sendResult.success) {
      await this.writeLog({
        storeId: input.storeId,
        taskId: input.taskId,
        toNumber: input.toNumber,
        status: 'SENT',
        providerMessageId: sendResult.value.providerMessageId,
        error: null,
        attemptCount: 1,
      });
      return 'sent';
    }

    await this.writeLog({
      storeId: input.storeId,
      taskId: input.taskId,
      toNumber: input.toNumber,
      status: 'FAILED',
      providerMessageId: null,
      error:
        sendResult.error instanceof Error ? sendResult.error.message : String(sendResult.error),
      attemptCount: 1,
    });
    return 'failed';
  }

  private async writeLog(entry: Omit<WhatsAppLogEntry, 'createdAt'>) {
    try {
      await this.logRepo.create({ ...entry, createdAt: new Date() });
    } catch {
      // Logging must never break notification flow.
    }
  }
}
