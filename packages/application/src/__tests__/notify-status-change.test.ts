import { describe, expect, it, vi } from 'vitest';
import { ok } from '@car-spa/shared';
import { NotifyStatusChangeUseCase } from '../use-cases/notify-status-change.use-case';
import type {
  CustomerRepository,
  StoreSettingsRepository,
  VehicleRepository,
  VehicleTaskRepository,
} from '../ports';
import type { WhatsAppService } from '../services/whatsapp.service';

describe('NotifyStatusChangeUseCase', () => {
  it('resolves recipients and delegates to WhatsAppService', async () => {
    const whatsappService = {
      notifyStatusChange: vi.fn().mockResolvedValue(ok({ sent: 2, failed: 0, skipped: 0 })),
    } as unknown as WhatsAppService;

    const taskRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'task-1',
        orgId: 'org-1',
        customerId: 'cust-1',
        vehicleId: 'veh-1',
        status: 'COMPLETED',
        dueAmount: 450,
      }),
    } as unknown as VehicleTaskRepository;

    const customerRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'cust-1', name: 'Rahul', phone: '9876543211' }),
    } as unknown as CustomerRepository;

    const vehicleRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'veh-1', vehicleNumber: 'KA01AB1234' }),
    } as unknown as VehicleRepository;

    const settingsRepo = {
      findByOrgId: vi.fn().mockResolvedValue({ storeName: 'Big Bull', phone: '9876543210' }),
    } as unknown as StoreSettingsRepository;

    const useCase = new NotifyStatusChangeUseCase(
      whatsappService,
      taskRepo,
      customerRepo,
      vehicleRepo,
      settingsRepo,
    );

    const result = await useCase.execute({ storeId: 'org-1', taskId: 'task-1' });

    expect(result.success).toBe(true);
    expect(whatsappService.notifyStatusChange).toHaveBeenCalledWith({
      storeId: 'org-1',
      taskId: 'task-1',
      status: 'COMPLETED',
      storeName: 'Big Bull',
      ownerNumber: '9876543210',
      customerNumber: '9876543211',
      customerName: 'Rahul',
      vehicleNumber: 'KA01AB1234',
      amountDue: 450,
    });
  });

  it('returns an error when the task is missing', async () => {
    const whatsappService = {
      notifyStatusChange: vi.fn(),
    } as unknown as WhatsAppService;

    const useCase = new NotifyStatusChangeUseCase(
      whatsappService,
      { findById: vi.fn().mockResolvedValue(null) } as unknown as VehicleTaskRepository,
      {} as unknown as CustomerRepository,
      {} as unknown as VehicleRepository,
      {} as unknown as StoreSettingsRepository,
    );

    const result = await useCase.execute({ storeId: 'org-1', taskId: 'nope' });
    expect(result.success).toBe(false);
    expect(whatsappService.notifyStatusChange).not.toHaveBeenCalled();
  });
});
