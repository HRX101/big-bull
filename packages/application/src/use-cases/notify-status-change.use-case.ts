import { err, ok, type Result } from '@car-spa/shared';
import type {
  CustomerRepository,
  StoreSettingsRepository,
  VehicleRepository,
  VehicleTaskRepository,
} from '../ports';
import type { StatusChangeNotificationResult, WhatsAppService } from '../services/whatsapp.service';

export interface NotifyStatusChangeInput {
  storeId: string;
  taskId: string;
}

export class NotifyStatusChangeUseCase {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly vehicleRepo: VehicleRepository,
    private readonly settingsRepo: StoreSettingsRepository,
  ) {}

  async execute(input: NotifyStatusChangeInput): Promise<Result<StatusChangeNotificationResult>> {
    try {
      const task = await this.taskRepo.findById(input.taskId);
      if (!task || task.orgId !== input.storeId) {
        return err(new Error('Task not found in this organization'));
      }

      const [customer, vehicle, settings] = await Promise.all([
        task.customerId ? this.customerRepo.findById(task.customerId) : Promise.resolve(null),
        task.vehicleId ? this.vehicleRepo.findById(task.vehicleId) : Promise.resolve(null),
        this.settingsRepo.findByOrgId(input.storeId),
      ]);

      return this.whatsappService.notifyStatusChange({
        storeId: input.storeId,
        taskId: task.id,
        status: task.status,
        storeName: settings?.storeName ?? 'Store',
        ownerNumber: settings?.phone ?? null,
        customerNumber: customer?.phone ?? null,
        customerName: customer?.name ?? null,
        vehicleNumber: vehicle?.vehicleNumber ?? null,
        amountDue: task.dueAmount,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to send status notification'));
    }
  }
}
