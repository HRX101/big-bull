import type { TaskStatusEvent, VehicleTask } from '@car-spa/domain';
import {
  recordPaymentSchema,
  taskStatusChangeSchema,
  vehicleTaskCreateSchema,
} from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  CustomerRepository,
  DraftRepository,
  TaskStatusEventRepository,
  VehicleRepository,
  VehicleTaskRepository,
} from '../ports';

export class CreateVehicleTaskUseCase {
  constructor(
    private readonly taskRepo: VehicleTaskRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly vehicleRepo: VehicleRepository,
    private readonly eventRepo: TaskStatusEventRepository,
    private readonly auditRepo: AuditRepository,
    private readonly draftRepo: DraftRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<VehicleTask>> {
    const parsed = vehicleTaskCreateSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const customer = await this.customerRepo.findById(parsed.data.customerId);
      if (!customer) {
        return err(new Error('Customer not found'));
      }

      const vehicle = await this.vehicleRepo.findById(parsed.data.vehicleId);
      if (!vehicle) {
        return err(new Error('Vehicle not found'));
      }

      const dueAmount = parsed.data.totalAmount - parsed.data.paidAmount;
      const paymentStatus =
        dueAmount <= 0 ? 'FULL' : parsed.data.paidAmount > 0 ? 'PARTIAL' : 'PENDING';

      const task = await this.taskRepo.create({
        orgId,
        customerId: parsed.data.customerId,
        vehicleId: parsed.data.vehicleId,
        serviceIds: parsed.data.serviceIds,
        status: 'RECEIVED',
        paymentMode: parsed.data.paymentMode,
        paymentStatus,
        totalAmount: parsed.data.totalAmount,
        paidAmount: parsed.data.paidAmount,
        dueAmount,
        notes: parsed.data.notes || null,
        assignedTo: null,
        receiptUrl: null,
        createdBy: actorId,
      });

      await this.eventRepo.create({
        orgId,
        taskId: task.id,
        fromStatus: null,
        toStatus: 'RECEIVED',
        note: 'Task created',
        actorId,
        whatsappStatus: 'NOT_APPLICABLE',
      });

      await this.customerRepo.update(customer.id, {
        visitCount: customer.visitCount + 1,
        totalSpend: customer.totalSpend + parsed.data.totalAmount,
      });

      const draft = await this.draftRepo.findByUserAndType(actorId, 'vehicle-task');
      if (draft) {
        await this.draftRepo.delete(draft.id);
      }

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'vehicleTask.create',
        resourceType: 'vehicleTask',
        resourceId: task.id,
        metadata: { amount: task.totalAmount },
      });

      return ok(task);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create task'));
    }
  }
}

export class ChangeTaskStatusUseCase {
  constructor(
    private readonly taskRepo: VehicleTaskRepository,
    private readonly eventRepo: TaskStatusEventRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<TaskStatusEvent>> {
    const parsed = taskStatusChangeSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const task = await this.taskRepo.findById(parsed.data.taskId);
      if (!task) {
        return err(new Error('Task not found'));
      }
      if (task.orgId !== orgId) {
        return err(new Error('Task not found in this organization'));
      }

      if (parsed.data.toStatus === 'COMPLETED' && task.dueAmount > 0) {
        return err(
          new Error(
            `Outstanding payment of ₹${task.dueAmount.toLocaleString('en-IN')}. Clear the due payment before completing the task.`,
          ),
        );
      }

      await this.taskRepo.update(task.id, { status: parsed.data.toStatus });

      const event = await this.eventRepo.create({
        orgId,
        taskId: task.id,
        fromStatus: task.status,
        toStatus: parsed.data.toStatus,
        note: parsed.data.note,
        actorId,
        whatsappStatus: 'PENDING',
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'vehicleTask.statusChange',
        resourceType: 'taskStatusEvent',
        resourceId: event.id,
        metadata: { taskId: task.id, from: task.status, to: parsed.data.toStatus },
      });

      return ok(event);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to change status'));
    }
  }
}

export class RecordTaskPaymentUseCase {
  constructor(
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<VehicleTask>> {
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const task = await this.taskRepo.findById(parsed.data.taskId);
      if (!task) {
        return err(new Error('Task not found'));
      }
      if (task.orgId !== orgId) {
        return err(new Error('Task not found in this organization'));
      }
      if (task.dueAmount <= 0) {
        return err(new Error('No outstanding payment on this task'));
      }

      const paidAmount = task.paidAmount + parsed.data.amount;
      const dueAmount = Math.max(0, task.totalAmount - paidAmount);
      const paymentStatus = dueAmount <= 0 ? 'FULL' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

      const updated = await this.taskRepo.update(task.id, {
        paidAmount,
        dueAmount,
        paymentStatus,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'vehicleTask.paymentRecorded',
        resourceType: 'vehicleTask',
        resourceId: task.id,
        metadata: { amount: parsed.data.amount, dueAmount },
      });

      return ok(updated);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to record payment'));
    }
  }
}
