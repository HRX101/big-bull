import type { VehicleTaskStatus } from '@car-spa/domain';
import {
  canTransitionVehicleTask,
  customerSchema,
  employeeSchema,
  inventoryItemSchema,
  mechanicSchema,
  payrollEntrySchema,
  posOrderSchema,
  vehicleSchema,
  vehicleTaskSchema,
  vehicleTaskTransitionSchema,
} from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import { requireOrgContext, requirePermission } from '../context';
import type {
  AnalyticsRepository,
  AuditRepository,
  AuthRepository,
  CustomerRepository,
  EmployeeRepository,
  InventoryRepository,
  MechanicRepository,
  NotificationRepository,
  PayrollRepository,
  PosOrderRepository,
  VehicleRepository,
  VehicleTaskRepository,
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
      const task = await this.taskRepo.create(ctx.orgId, {
        vehicleId: parsed.data.vehicleId,
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: 'received',
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
          body: `Task "${task.title}" created`,
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

export class TransitionVehicleTaskUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly taskRepo: VehicleTaskRepository,
    private readonly auditRepo: AuditRepository,
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
      return ok(updated);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to transition task'));
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
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').InventoryItem>> {
    const parsed = inventoryItemSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'inventory:create');
      const item = await this.inventoryRepo.create(ctx.orgId, parsed.data);
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
        employeeId: parsed.data.employeeId,
        specializations: parsed.data.specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        isAvailable: parsed.data.isAvailable,
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
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<import('@car-spa/domain').PosOrder>> {
    const parsed = posOrderSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'pos:create');
      const items = parsed.data.items.map((item) => ({
        ...item,
        lineTotal: item.quantity * item.unitPrice,
      }));
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const tax = parsed.data.tax ?? 0;
      const order = await this.posRepo.create(ctx.orgId, {
        customerId: parsed.data.customerId ?? null,
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
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    orderId: string,
    paymentMethod: import('@car-spa/domain').PaymentMethod,
  ): Promise<Result<import('@car-spa/domain').PosOrder>> {
    try {
      const ctx = requireOrgContext(await this.authRepo.getCurrentSession());
      requirePermission(ctx, 'pos:pay');
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
