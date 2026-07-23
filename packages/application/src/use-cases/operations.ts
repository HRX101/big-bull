import type { VehicleTaskStatus } from '@car-spa/domain';
import {
  buildVehicleTaskStatusWhatsAppMessage,
  canTransitionVehicleTask,
  customerSchema,
  employeeSchema,
  formatVehicleTaskVehicle,
  generateVehicleTaskCode,
  buildInventoryItemName,
  inventoryCategorySchema,
  inventoryItemSchema,
  validateInventoryAttributes,
  mechanicSchema,
  mechanicSalesRecordSchema,
  payrollEntrySchema,
  posOrderSchema,
  vehicleSchema,
  vehicleTaskPaymentUpdateSchema,
  vehicleTaskSchema,
  vehicleTaskTransitionSchema,
  vehicleTaskUpdateSchema,
} from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import { requireOrgContext, requirePermission } from '../context';
import type {
  AnalyticsRepository,
  AuditRepository,
  AuthRepository,
  CustomerRepository,
  EmployeeRepository,
  InventoryCategoryRepository,
  InventoryRepository,
  MechanicRepository,
  MechanicSalesRecordRepository,
  NotificationRepository,
  PayrollRepository,
  PosOrderRepository,
  VehicleRepository,
  VehicleTaskRepository,
  WhatsAppMessagingService,
} from '../ports';

async function logAction(
  auditRepo: AuditRepository,
  orgId: string,
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await auditRepo.log({ orgId, actorId, action, resourceType, resourceId, metadata });
  } catch {
    // Best-effort audit logging
  }
}

export class ListCustomersUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly customerRepo: CustomerRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').Customer[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'customers:read');
      return ok(await this.customerRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list customers'));
    }
  }
}

export class CreateCustomerUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').Customer>> {
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'customers:create');
      const customer = await this.customerRepo.create(ctx.orgId, {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes ?? null,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'customer.create',
        'customer',
        customer.id,
      );
      return ok(customer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create customer'));
    }
  }
}

export class UpdateCustomerUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string, input: unknown): Promise<Result<import('@car-spa/domain').Customer>> {
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'customers:update');
      const customer = await this.customerRepo.update(ctx.orgId, id, {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes ?? null,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'customer.update', 'customer', id);
      return ok(customer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update customer'));
    }
  }
}

export class DeleteCustomerUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'customers:delete');
      await this.customerRepo.delete(ctx.orgId, id);
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'customer.delete', 'customer', id);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete customer'));
    }
  }
}

export class ListVehiclesUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly vehicleRepo: VehicleRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').Vehicle[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'vehicles:read');
      return ok(await this.vehicleRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list vehicles'));
    }
  }
}

export class CreateVehicleUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly vehicleRepo: VehicleRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').Vehicle>> {
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'vehicles:create');
      const vehicle = await this.vehicleRepo.create(ctx.orgId, {
        customerId: parsed.data.customerId,
        make: parsed.data.make,
        model: parsed.data.model,
        year: parsed.data.year,
        plateNumber: parsed.data.plateNumber,
        color: parsed.data.color ?? null,
        vin: parsed.data.vin ?? null,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'vehicle.create',
        'vehicle',
        vehicle.id,
      );
      return ok(vehicle);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create vehicle'));
    }
  }
}

export class ListVehicleTasksUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').VehicleTask[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:read');
      return ok(await this.taskRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list tasks'));
    }
  }
}

export class CreateVehicleTaskUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').VehicleTask>> {
    const parsed = vehicleTaskSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:create');
      const existingTasks = await this.taskRepo.listByOrg(ctx.orgId);
      const taskCode = generateVehicleTaskCode(existingTasks.map((task) => task.taskCode));
      const task = await this.taskRepo.create(ctx.orgId, {
        taskCode,
        vehicleBrand: parsed.data.vehicleBrand,
        vehicleModel: parsed.data.vehicleModel,
        vehicleNumber: parsed.data.vehicleNumber,
        customerId: parsed.data.customerId,
        services: parsed.data.services,
        paymentMethod: parsed.data.paymentMethod,
        amount: parsed.data.amount,
        advancePayment: parsed.data.advancePayment,
        problemStatement: null,
        description: null,
        status: 'todo',
        assignedMechanicId: parsed.data.assignedMechanicId ?? null,
        estimatedCompletion: parsed.data.estimatedCompletion
          ? new Date(parsed.data.estimatedCompletion)
          : null,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'task.create', 'vehicleTask', task.id);
      try {
        await this.notificationRepo.create({
          orgId: ctx.orgId,
          userId: ctx.userId,
          title: 'New vehicle task',
          body: `Task ${task.taskCode} created`,
          type: 'task',
          read: false,
        });
      } catch {
        // Optional notification
      }
      return ok(task);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create task'));
    }
  }
}

export class UpdateVehicleTaskUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    id: string,
    input: unknown,
  ): Promise<Result<import('@car-spa/domain').VehicleTask>> {
    const parsed = vehicleTaskUpdateSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:update');
      const existing = await this.taskRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Task not found'));
      const task = await this.taskRepo.update(ctx.orgId, id, {
        vehicleBrand: parsed.data.vehicleBrand,
        vehicleModel: parsed.data.vehicleModel,
        vehicleNumber: parsed.data.vehicleNumber,
        customerId: parsed.data.customerId,
        services: parsed.data.services,
        paymentMethod: parsed.data.paymentMethod,
        amount: parsed.data.amount,
        advancePayment: parsed.data.advancePayment,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'task.update', 'vehicleTask', id);
      return ok(task);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update task'));
    }
  }
}

export class UpdateVehicleTaskPaymentUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').VehicleTask>> {
    const parsed = vehicleTaskPaymentUpdateSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:update');
      const existing = await this.taskRepo.findById(ctx.orgId, parsed.data.taskId);
      if (!existing) return err(new Error('Task not found'));
      const task = await this.taskRepo.updatePayment(ctx.orgId, parsed.data.taskId, {
        paymentMethod: parsed.data.paymentMethod,
        amount: parsed.data.amount,
        advancePayment: parsed.data.advancePayment,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'task.payment.update',
        'vehicleTask',
        parsed.data.taskId,
      );
      return ok(task);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update task payment'));
    }
  }
}

export class DeleteVehicleTaskUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:delete');
      const existing = await this.taskRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Task not found'));
      await this.taskRepo.delete(ctx.orgId, id);
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'task.delete', 'vehicleTask', id);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete task'));
    }
  }
}

export class TransitionVehicleTaskUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
    private readonly whatsAppService: WhatsAppMessagingService,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').VehicleTask>> {
    const parsed = vehicleTaskTransitionSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'tasks:transition');
      const task = await this.taskRepo.findById(ctx.orgId, parsed.data.taskId);
      if (!task) return err(new Error('Task not found'));
      if (!canTransitionVehicleTask(task.status, parsed.data.toStatus)) {
        return err(new Error(`Cannot transition from ${task.status} to ${parsed.data.toStatus}`));
      }
      const updated = await this.taskRepo.updateStatus(
        ctx.orgId,
        parsed.data.taskId,
        parsed.data.toStatus,
      );
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'task.transition',
        'vehicleTask',
        task.id,
        {
          from: task.status,
          to: parsed.data.toStatus,
        },
      );
      try {
        const customer = await this.customerRepo.findById(ctx.orgId, updated.customerId);
        if (customer?.phone) {
          await this.whatsAppService.sendMessage({
            to: customer.phone,
            body: buildVehicleTaskStatusWhatsAppMessage({
              customerName: customer.name,
              taskCode: updated.taskCode,
              vehicleLabel: formatVehicleTaskVehicle(updated),
              status: parsed.data.toStatus,
            }),
          });
        }
      } catch {
        // Best-effort WhatsApp notification
      }
      return ok(updated);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to transition task'));
    }
  }
}

export class ListInventoryCategoriesUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').InventoryCategory[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:read');
      return ok(await this.categoryRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list inventory categories'));
    }
  }
}

export class CreateInventoryCategoryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').InventoryCategory>> {
    const parsed = inventoryCategorySchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:create');
      const category = await this.categoryRepo.create(ctx.orgId, {
        name: parsed.data.name,
        fields: parsed.data.fields,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventoryCategory.create',
        'inventoryCategory',
        category.id,
      );
      return ok(category);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create inventory category'));
    }
  }
}

export class UpdateInventoryCategoryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    id: string,
    input: unknown,
  ): Promise<Result<import('@car-spa/domain').InventoryCategory>> {
    const parsed = inventoryCategorySchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:create');
      const existing = await this.categoryRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Category not found'));
      const category = await this.categoryRepo.update(ctx.orgId, id, {
        name: parsed.data.name,
        fields: parsed.data.fields,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventoryCategory.update',
        'inventoryCategory',
        id,
      );
      return ok(category);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update inventory category'));
    }
  }
}

export class DeleteInventoryCategoryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:delete');
      const existing = await this.categoryRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Category not found'));
      const items = await this.inventoryRepo.listByCategory(ctx.orgId, id);
      if (items.length > 0) {
        return err(new Error('Remove all items in this category before deleting it'));
      }
      await this.categoryRepo.delete(ctx.orgId, id);
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventoryCategory.delete',
        'inventoryCategory',
        id,
      );
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete inventory category'));
    }
  }
}

export class ListInventoryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').InventoryItem[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:read');
      return ok(await this.inventoryRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list inventory'));
    }
  }
}

export class CreateInventoryItemUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').InventoryItem>> {
    const parsed = inventoryItemSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:create');
      const category = await this.categoryRepo.findById(ctx.orgId, parsed.data.categoryId);
      if (!category) return err(new Error('Category not found'));
      const attributeError = validateInventoryAttributes(category, parsed.data.attributes);
      if (attributeError) return err(new Error(attributeError));
      const item = await this.inventoryRepo.create(ctx.orgId, {
        categoryId: parsed.data.categoryId,
        sku: parsed.data.sku,
        name: parsed.data.name ?? buildInventoryItemName(category, parsed.data.attributes),
        attributes: parsed.data.attributes,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        reorderLevel: parsed.data.reorderLevel,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventory.create',
        'inventoryItem',
        item.id,
      );
      return ok(item);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create inventory item'));
    }
  }
}

export class UpdateInventoryItemUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly categoryRepo: InventoryCategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    id: string,
    input: unknown,
  ): Promise<Result<import('@car-spa/domain').InventoryItem>> {
    const parsed = inventoryItemSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:update');
      const existing = await this.inventoryRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Item not found'));
      const category = await this.categoryRepo.findById(ctx.orgId, parsed.data.categoryId);
      if (!category) return err(new Error('Category not found'));
      const attributeError = validateInventoryAttributes(category, parsed.data.attributes);
      if (attributeError) return err(new Error(attributeError));
      const item = await this.inventoryRepo.update(ctx.orgId, id, {
        categoryId: parsed.data.categoryId,
        sku: parsed.data.sku,
        name: parsed.data.name ?? buildInventoryItemName(category, parsed.data.attributes),
        attributes: parsed.data.attributes,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        reorderLevel: parsed.data.reorderLevel,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventory.update',
        'inventoryItem',
        id,
      );
      return ok(item);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update inventory item'));
    }
  }
}

export class DeleteInventoryItemUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:delete');
      const existing = await this.inventoryRepo.findById(ctx.orgId, id);
      if (!existing) return err(new Error('Item not found'));
      await this.inventoryRepo.delete(ctx.orgId, id);
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'inventory.delete',
        'inventoryItem',
        id,
      );
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete inventory item'));
    }
  }
}

export class ListEmployeesUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').Employee[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'employees:read');
      return ok(await this.employeeRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list employees'));
    }
  }
}

export class CreateEmployeeUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').Employee>> {
    const parsed = employeeSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'employees:create');
      const employee = await this.employeeRepo.create(ctx.orgId, {
        userId: null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        jobTitle: parsed.data.jobTitle,
        status: parsed.data.status,
        hireDate: new Date(parsed.data.hireDate),
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'employee.create',
        'employee',
        employee.id,
      );
      return ok(employee);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create employee'));
    }
  }
}

export class ListMechanicsUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly mechanicRepo: MechanicRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').Mechanic[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:read');
      return ok(await this.mechanicRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list mechanics'));
    }
  }
}

export class CreateMechanicUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly mechanicRepo: MechanicRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').Mechanic>> {
    const parsed = mechanicSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:create');
      const mechanic = await this.mechanicRepo.create(ctx.orgId, {
        name: parsed.data.name,
        storeName: parsed.data.storeName,
        phone: parsed.data.phone,
        contactName: parsed.data.contactName?.trim() || null,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'mechanic.create',
        'mechanic',
        mechanic.id,
      );
      return ok(mechanic);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create mechanic'));
    }
  }
}

export class UpdateMechanicUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly mechanicRepo: MechanicRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    id: string,
    input: unknown,
  ): Promise<Result<import('@car-spa/domain').Mechanic>> {
    const parsed = mechanicSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:update');
      const mechanic = await this.mechanicRepo.update(ctx.orgId, id, {
        name: parsed.data.name,
        storeName: parsed.data.storeName,
        phone: parsed.data.phone,
        contactName: parsed.data.contactName?.trim() || null,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'mechanic.update', 'mechanic', id);
      return ok(mechanic);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update mechanic'));
    }
  }
}

export class DeleteMechanicUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly mechanicRepo: MechanicRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:delete');
      await this.mechanicRepo.delete(ctx.orgId, id);
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'mechanic.delete', 'mechanic', id);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete mechanic'));
    }
  }
}

export class ListMechanicSalesRecordsUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly salesRecordRepo: MechanicSalesRecordRepository,
  ) {}

  async execute(mechanicId?: string): Promise<Result<import('@car-spa/domain').MechanicSalesRecord[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:read');
      const records = mechanicId
        ? await this.salesRecordRepo.listByMechanic(ctx.orgId, mechanicId)
        : await this.salesRecordRepo.listByOrg(ctx.orgId);
      return ok(records);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list sales records'));
    }
  }
}

export class CreateMechanicSalesRecordUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly mechanicRepo: MechanicRepository,
    private readonly salesRecordRepo: MechanicSalesRecordRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').MechanicSalesRecord>> {
    const parsed = mechanicSalesRecordSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'mechanics:update');
      const mechanic = await this.mechanicRepo.findById(ctx.orgId, parsed.data.mechanicId);
      if (!mechanic) return err(new Error('Mechanic not found'));

      const record = await this.salesRecordRepo.create(ctx.orgId, {
        mechanicId: parsed.data.mechanicId,
        fromDate: new Date(parsed.data.fromDate),
        toDate: new Date(parsed.data.toDate),
        items: parsed.data.items.map((item) => ({
          inventoryItemId: item.inventoryItemId ?? null,
          description: item.description,
          quantity: item.quantity,
        })),
        totalAmount: parsed.data.totalAmount,
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'mechanic.salesRecord.create',
        'mechanicSalesRecord',
        record.id,
        { mechanicId: parsed.data.mechanicId },
      );
      return ok(record);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to save sales record'));
    }
  }
}

export class ListPosOrdersUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly posRepo: PosOrderRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').PosOrder[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'pos:read');
      return ok(await this.posRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list orders'));
    }
  }
}

export class CreatePosOrderUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly posRepo: PosOrderRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly mechanicRepo: MechanicRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').PosOrder>> {
    const parsed = posOrderSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'pos:create');

      if (parsed.data.buyerType === 'mechanic') {
        const mechanic = await this.mechanicRepo.findById(ctx.orgId, parsed.data.mechanicId!);
        if (!mechanic) return err(new Error('Mechanic not found'));
      }
      if (parsed.data.buyerType === 'customer') {
        const customer = await this.customerRepo.findById(ctx.orgId, parsed.data.customerId!);
        if (!customer) return err(new Error('Customer not found'));
      }

      const items: import('@car-spa/domain').PosOrderItem[] = [];
      for (const item of parsed.data.items) {
        const inventoryItem = await this.inventoryRepo.findById(ctx.orgId, item.inventoryItemId);
        if (!inventoryItem) {
          return err(new Error(`Inventory item not found: ${item.description}`));
        }
        if (inventoryItem.quantity < item.quantity) {
          return err(
            new Error(`Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}`),
          );
        }
        items.push({
          inventoryItemId: inventoryItem.id,
          description: item.description || inventoryItem.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        });
      }

      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const tax = parsed.data.tax ?? 0;
      const order = await this.posRepo.create(ctx.orgId, {
        buyerType: parsed.data.buyerType,
        mechanicId: parsed.data.buyerType === 'mechanic' ? (parsed.data.mechanicId ?? null) : null,
        customerId: parsed.data.buyerType === 'customer' ? (parsed.data.customerId ?? null) : null,
        buyerName:
          parsed.data.buyerType === 'walk_in' ? parsed.data.buyerName?.trim() || null : null,
        buyerContact:
          parsed.data.buyerType === 'walk_in' ? parsed.data.buyerContact?.trim() || null : null,
        vehicleTaskId: parsed.data.vehicleTaskId ?? null,
        items,
        subtotal,
        tax,
        total: subtotal + tax,
        status: 'draft',
        paymentMethod: parsed.data.paymentMethod ?? null,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'pos.create', 'posOrder', order.id);
      return ok(order);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create order'));
    }
  }
}

export class PayPosOrderUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly posRepo: PosOrderRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    orderId: string,
    paymentMethod: import('@car-spa/domain').PaymentMethod,
  ): Promise<Result<import('@car-spa/domain').PosOrder>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'pos:pay');

      const existing = await this.posRepo.findById(ctx.orgId, orderId);
      if (!existing) return err(new Error('Order not found'));
      if (existing.status === 'paid') return err(new Error('Order is already paid'));
      if (existing.status === 'cancelled') return err(new Error('Cannot pay a cancelled order'));

      for (const item of existing.items) {
        if (!item.inventoryItemId) continue;
        const inventoryItem = await this.inventoryRepo.findById(ctx.orgId, item.inventoryItemId);
        if (!inventoryItem) {
          return err(new Error(`Inventory item not found for ${item.description}`));
        }
        if (inventoryItem.quantity < item.quantity) {
          return err(
            new Error(`Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}`),
          );
        }
      }

      for (const item of existing.items) {
        if (!item.inventoryItemId) continue;
        await this.inventoryRepo.adjustQuantity(ctx.orgId, item.inventoryItemId, -item.quantity);
      }

      const order = await this.posRepo.update(ctx.orgId, orderId, {
        status: 'paid',
        paymentMethod,
      });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'pos.pay', 'posOrder', orderId, {
        paymentMethod,
      });
      return ok(order);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to pay order'));
    }
  }
}

export class ListPayrollEntriesUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly payrollRepo: PayrollRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').PayrollEntry[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'payroll:read');
      return ok(await this.payrollRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list payroll'));
    }
  }
}

export class CreatePayrollEntryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly payrollRepo: PayrollRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').PayrollEntry>> {
    const parsed = payrollEntrySchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'payroll:create');
      const netPay = parsed.data.grossPay - parsed.data.deductions;
      const entry = await this.payrollRepo.create(ctx.orgId, {
        employeeId: parsed.data.employeeId,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        grossPay: parsed.data.grossPay,
        deductions: parsed.data.deductions,
        netPay,
        status: 'draft',
      });
      await logAction(
        this.auditRepo,
        ctx.orgId,
        ctx.userId,
        'payroll.create',
        'payrollEntry',
        entry.id,
      );
      return ok(entry);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create payroll entry'));
    }
  }
}

export class ApprovePayrollEntryUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly payrollRepo: PayrollRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(id: string): Promise<Result<import('@car-spa/domain').PayrollEntry>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'payroll:approve');
      const entry = await this.payrollRepo.update(ctx.orgId, id, { status: 'approved' });
      await logAction(this.auditRepo, ctx.orgId, ctx.userId, 'payroll.approve', 'payrollEntry', id);
      return ok(entry);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to approve payroll'));
    }
  }
}

export class ListAuditLogsUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').AuditLogEntry[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'audit:read');
      return ok(await this.auditRepo.listByOrg(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list audit logs'));
    }
  }
}

export class ListNotificationsUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').AppNotification[]>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'notifications:read');
      return ok(await this.notificationRepo.listByUser(ctx.orgId, ctx.userId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to list notifications'));
    }
  }
}

export class MarkNotificationReadUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'notifications:update');
      await this.notificationRepo.markRead(ctx.orgId, ctx.userId, id);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to mark notification read'));
    }
  }
}

export class GetWorkshopAnalyticsUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async execute(): Promise<Result<import('@car-spa/domain').WorkshopAnalytics>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'analytics:read');
      return ok(await this.analyticsRepo.getWorkshopMetrics(ctx.orgId));
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to load analytics'));
    }
  }
}
