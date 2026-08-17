import { describe, expect, it, vi } from 'vitest';
import { ok, err } from '@car-spa/shared';
import {
  WhatsAppService,
  normalizeWhatsAppPhone,
  buildDedupeKey,
} from '../services/whatsapp.service';
import type {
  IWhatsAppProvider,
  NotificationTemplateRepository,
  WhatsAppDedupeRepository,
  WhatsAppLogRepository,
} from '../ports/whatsapp-provider.port';

function createHarness(options?: {
  provider?: IWhatsAppProvider;
  dedupeResult?: boolean;
  template?: { messageTemplate: string };
}) {
  const provider: IWhatsAppProvider = options?.provider ?? {
    send: vi.fn().mockResolvedValue(ok({ providerMessageId: 'msg-1' })),
  };
  const templateRepo: NotificationTemplateRepository = {
    findByOrgId: vi.fn().mockResolvedValue(
      options?.template ?? {
        storeId: 'org-1',
        messageTemplate: 'Hi {{customerName}}',
        placeholders: [],
        updatedBy: 'u',
        updatedAt: new Date(),
      },
    ),
    upsert: vi.fn(),
  };
  const logRepo: WhatsAppLogRepository = { create: vi.fn().mockResolvedValue(undefined) };
  const dedupeRepo: WhatsAppDedupeRepository = {
    acquire: vi.fn().mockResolvedValue(options?.dedupeResult ?? true),
  };
  const service = new WhatsAppService(provider, templateRepo, logRepo, dedupeRepo, {
    defaultCountryCode: '91',
  });
  return { provider, templateRepo, logRepo, dedupeRepo, service };
}

describe('WhatsAppService', () => {
  it('sends one message to the owner and one to the customer with rendered template', async () => {
    const { provider, service } = createHarness({
      template: { messageTemplate: 'Hi {{customerName}}, task {{taskId}} now {{status}}' },
    });

    const result = await service.notifyStatusChange({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'READY_FOR_PICKUP',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: '9876543211',
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
      amountDue: 450,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(provider.send).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(provider.send).mock.calls;
    const toNumbers = calls.map(([payload]) => payload.toNumber);
    expect(toNumbers).toEqual(expect.arrayContaining(['+919876543210', '+919876543211']));
    for (const [payload] of calls) {
      expect(payload.rawText).toContain('Rahul');
      expect(payload.rawText).toContain('READY_FOR_PICKUP');
    }
  });

  it('owner send failure does not block the customer send', async () => {
    const provider: IWhatsAppProvider = {
      send: vi
        .fn()
        .mockResolvedValueOnce(err(new Error('Meta API error (500): boom')))
        .mockResolvedValueOnce(ok({ providerMessageId: 'msg-2' })),
    };
    const { logRepo, service } = createHarness({ provider });

    const result = await service.notifyStatusChange({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'COMPLETED',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: '9876543211',
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect(provider.send).toHaveBeenCalledTimes(2);

    const entries = vi.mocked(logRepo.create).mock.calls.map(([e]) => e.status);
    expect(entries).toContain('FAILED');
    expect(entries).toContain('SENT');
  });

  it('deduplicates the same number given for owner and customer', async () => {
    const { provider, service } = createHarness();

    const result = await service.notifyStatusChange({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'IN_PROGRESS',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: '9876543210',
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(result.value.sent).toBe(1);
  });

  it('skips when the dedupe key already exists', async () => {
    const provider: IWhatsAppProvider = { send: vi.fn() };
    const { logRepo, service } = createHarness({ provider, dedupeResult: false });

    const result = await service.notifyStatusChange({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'CANCELLED',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: null,
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(provider.send).not.toHaveBeenCalled();
    expect(result.value).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(vi.mocked(logRepo.create).mock.calls.map(([e]) => e.status)).toContain('SKIPPED');
  });

  it('falls back to the default template when none is stored', async () => {
    const { templateRepo, provider, service } = createHarness({ template: undefined });
    vi.mocked(templateRepo.findByOrgId).mockResolvedValue(null);

    await service.notifyStatusChange({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'COMPLETED',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: null,
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
    });

    const rawText = vi.mocked(provider.send).mock.calls[0]?.[0].rawText ?? '';
    expect(rawText).toContain('Rahul');
    expect(rawText).toContain('KA01AB1234');
  });
});

describe('normalizeWhatsAppPhone', () => {
  it('normalizes 10-digit Indian numbers to E.164', () => {
    expect(normalizeWhatsAppPhone('9876543210', '91')).toBe('+919876543210');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeWhatsAppPhone('+91 98765 43210', '91')).toBe('+919876543210');
    expect(normalizeWhatsAppPhone('098765-43210', '91')).toBe('+919876543210');
  });

  it('keeps already-international numbers', () => {
    expect(normalizeWhatsAppPhone('+14155552671', '91')).toBe('+14155552671');
  });

  it('returns empty string for invalid input', () => {
    expect(normalizeWhatsAppPhone('', '91')).toBe('');
    expect(normalizeWhatsAppPhone('abc', '91')).toBe('');
  });
});

describe('buildDedupeKey', () => {
  it('combines task, status, and recipient', () => {
    expect(buildDedupeKey('task-1', 'COMPLETED', '+919876543210')).toBe(
      'task-1|COMPLETED|+919876543210',
    );
  });
});
