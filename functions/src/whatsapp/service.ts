import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { WhatsAppFunctionConfig } from '../config/whatsapp.config';
import { DEFAULT_STATUS_CHANGE_TEMPLATE, renderTemplate, type TemplateValues } from './template';
import {
  MetaWhatsAppAdapter,
  TwilioWhatsAppAdapter,
  WasenderWhatsAppAdapter,
  type SendPayload,
} from './adapters';

const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

export interface NotifyStatusChangeInput {
  storeId: string;
  taskId: string;
  status: string;
  ownerNumber: string | null;
  customerNumber: string | null;
  customerName: string | null;
  vehicleNumber: string | null;
  storeName: string;
  fromNumber?: string;
  amountDue?: number;
}

export interface SendToRecipientInput {
  storeId: string;
  taskId: string;
  status: string;
  toNumber: string;
  fromNumber?: string;
  values: TemplateValues;
  templateName?: string;
}

const db = getFirestore();

export function normalizePhone(phone: string, defaultCountryCode: string): string {
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

export interface SendOutcome {
  status: 'sent' | 'failed' | 'skipped';
  retryable: boolean;
  error?: string | null;
}

export function parseStatusCode(error: string | null): number | null {
  if (!error) return null;
  const match = /\((\d{3})\)/.exec(error);
  return match ? Number(match[1]) : null;
}

export class WhatsAppService {
  private readonly provider:
    MetaWhatsAppAdapter | TwilioWhatsAppAdapter | WasenderWhatsAppAdapter | null;
  private readonly templateCache = new Map<string, { template: string; expiresAt: number }>();

  constructor(private readonly config: WhatsAppFunctionConfig) {
    if (config.provider === 'meta' && config.meta) {
      this.provider = new MetaWhatsAppAdapter(config.meta);
    } else if (config.provider === 'twilio' && config.twilio) {
      this.provider = new TwilioWhatsAppAdapter(config.twilio);
    } else if (config.provider === 'wasender' && config.wasender) {
      this.provider = new WasenderWhatsAppAdapter(config.wasender);
    } else {
      this.provider = null;
    }
  }

  async getTemplate(storeId: string): Promise<string> {
    const cached = this.templateCache.get(storeId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.template;
    }

    let template = DEFAULT_STATUS_CHANGE_TEMPLATE;
    const doc = await db.collection('notificationTemplates').doc(storeId).get();
    if (doc.exists) {
      const stored = doc.data()?.messageTemplate;
      if (typeof stored === 'string' && stored.trim()) {
        template = stored;
      }
    }

    this.templateCache.set(storeId, { template, expiresAt: Date.now() + TEMPLATE_CACHE_TTL_MS });
    return template;
  }

  async notifyStatusChange(input: NotifyStatusChangeInput): Promise<{
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const template = await this.getTemplate(input.storeId);
    const values: TemplateValues = {
      customerName: input.customerName ?? 'Customer',
      vehicleNumber: input.vehicleNumber ?? 'your vehicle',
      storeName: input.storeName,
      status: input.status,
      taskId: input.taskId,
      amountDue:
        input.amountDue !== undefined ? `₹${input.amountDue.toLocaleString('en-IN')}` : '₹0',
    };
    const message = renderTemplate(template, values);

    const recipients = new Set<string>();
    for (const phone of [input.ownerNumber, input.customerNumber]) {
      if (!phone) continue;
      const normalized = normalizePhone(phone, this.config.defaultCountryCode);
      if (normalized) recipients.add(normalized);
    }

    const result = { sent: 0, failed: 0, skipped: 0 };
    for (const toNumber of recipients) {
      const outcome = await this.sendToRecipient({
        storeId: input.storeId,
        taskId: input.taskId,
        status: input.status,
        toNumber,
        fromNumber: input.fromNumber,
        values,
      });
      if (outcome.status === 'sent') result.sent += 1;
      else if (outcome.status === 'failed') result.failed += 1;
      else result.skipped += 1;
    }

    return result;
  }

  async sendToRecipient(input: SendToRecipientInput): Promise<SendOutcome> {
    const dedupeKey = buildDedupeKey(input.taskId, input.status, input.toNumber);
    const acquired = await this.acquireDedupe(dedupeKey);
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
      return { status: 'skipped', retryable: false };
    }

    if (!this.provider) {
      await this.writeLog({
        storeId: input.storeId,
        taskId: input.taskId,
        toNumber: input.toNumber,
        status: 'FAILED',
        providerMessageId: null,
        error: `WhatsApp provider "${this.config.provider}" is not configured`,
        attemptCount: 1,
      });
      return { status: 'failed', retryable: false };
    }

    const payload: SendPayload = {
      toNumber: input.toNumber,
      fromNumber: input.fromNumber,
      rawText: renderTemplate(await this.getTemplate(input.storeId), input.values),
      params: input.values,
      templateName: input.templateName,
    };

    let sendResult;
    try {
      sendResult = await this.provider.send(payload);
    } catch (error) {
      sendResult = {
        ok: false,
        error: error instanceof Error ? error.message : 'Provider request threw an error',
      };
    }

    await this.writeLog({
      storeId: input.storeId,
      taskId: input.taskId,
      toNumber: input.toNumber,
      status: sendResult.ok ? 'SENT' : 'FAILED',
      providerMessageId: sendResult.ok ? (sendResult.providerMessageId ?? null) : null,
      error: sendResult.ok ? null : (sendResult.error ?? 'Unknown provider error'),
      attemptCount: 1,
    });

    if (sendResult.ok) {
      return { status: 'sent', retryable: false };
    }

    const statusCode = parseStatusCode(sendResult.error ?? null);
    const retryable =
      statusCode === null ? true : statusCode >= 500 || statusCode === 429 || statusCode === 408;
    return { status: 'failed', retryable, error: sendResult.error ?? null };
  }

  private async acquireDedupe(key: string): Promise<boolean> {
    const ref = db.collection('whatsappDedupe').doc(key);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) return false;
        tx.set(ref, { createdAt: FieldValue.serverTimestamp() });
        return true;
      });
    } catch {
      return false;
    }
  }

  private async writeLog(entry: {
    storeId: string;
    taskId: string;
    toNumber: string;
    status: string;
    providerMessageId: string | null;
    error: string | null;
    attemptCount: number;
  }): Promise<void> {
    try {
      await db.collection('whatsappLogs').add({
        ...entry,
        orgId: entry.storeId,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // Logging must never break the notification flow.
    }
  }
}

export function createWhatsAppService(config: WhatsAppFunctionConfig): WhatsAppService {
  return new WhatsAppService(config);
}
