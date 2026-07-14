import type {
  AnalyticsRepository,
  CustomerRepository,
  EmployeeRepository,
  InventoryRepository,
  MechanicRepository,
  NotificationRepository,
  PayrollRepository,
  PosOrderRepository,
  VehicleRepository,
  VehicleTaskRepository,
} from '@car-spa/application';
import type {
  AppNotification,
  Customer,
  Employee,
  InventoryItem,
  Mechanic,
  PayrollEntry,
  PaymentMethod,
  PosOrder,
  PosOrderItem,
  PosOrderStatus,
  Vehicle,
  VehicleTask,
  VehicleTaskStatus,
  WorkshopAnalytics,
} from '@car-spa/domain';
import {
  COLLECTIONS,
  addOrgDoc,
  deleteOrgDoc,
  fromFirestoreDate,
  getOrgDoc,
  listOrgDocs,
  updateOrgDoc,
} from '../firestore/helpers';

function mapCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    phone: String(data.phone),
    email: data.email ? String(data.email) : null,
    notes: data.notes ? String(data.notes) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapVehicle(id: string, data: Record<string, unknown>): Vehicle {
  return {
    id,
    orgId: String(data.orgId),
    customerId: String(data.customerId),
    make: String(data.make),
    model: String(data.model),
    year: Number(data.year),
    plateNumber: String(data.plateNumber),
    color: data.color ? String(data.color) : null,
    vin: data.vin ? String(data.vin) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapTask(id: string, data: Record<string, unknown>): VehicleTask {
  return {
    id,
    orgId: String(data.orgId),
    vehicleId: String(data.vehicleId),
    customerId: String(data.customerId),
    title: String(data.title),
    description: data.description ? String(data.description) : null,
    status: data.status as VehicleTaskStatus,
    assignedMechanicId: data.assignedMechanicId ? String(data.assignedMechanicId) : null,
    estimatedCompletion: data.estimatedCompletion
      ? fromFirestoreDate(data.estimatedCompletion)
      : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapInventory(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    id,
    orgId: String(data.orgId),
    sku: String(data.sku),
    name: String(data.name),
    category: String(data.category),
    quantity: Number(data.quantity),
    unitPrice: Number(data.unitPrice),
    reorderLevel: Number(data.reorderLevel),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapEmployee(id: string, data: Record<string, unknown>): Employee {
  return {
    id,
    orgId: String(data.orgId),
    userId: data.userId ? String(data.userId) : null,
    name: String(data.name),
    email: String(data.email),
    phone: String(data.phone),
    jobTitle: String(data.jobTitle),
    status: data.status === 'inactive' ? 'inactive' : 'active',
    hireDate: fromFirestoreDate(data.hireDate),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapMechanic(id: string, data: Record<string, unknown>): Mechanic {
  return {
    id,
    orgId: String(data.orgId),
    employeeId: String(data.employeeId),
    specializations: Array.isArray(data.specializations) ? data.specializations.map(String) : [],
    isAvailable: Boolean(data.isAvailable),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapPosOrder(id: string, data: Record<string, unknown>): PosOrder {
  const items = Array.isArray(data.items) ? (data.items as PosOrderItem[]) : [];
  return {
    id,
    orgId: String(data.orgId),
    customerId: data.customerId ? String(data.customerId) : null,
    vehicleTaskId: data.vehicleTaskId ? String(data.vehicleTaskId) : null,
    items,
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total),
    status: data.status as PosOrderStatus,
    paymentMethod: (data.paymentMethod as PaymentMethod) ?? null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapPayroll(id: string, data: Record<string, unknown>): PayrollEntry {
  return {
    id,
    orgId: String(data.orgId),
    employeeId: String(data.employeeId),
    periodStart: fromFirestoreDate(data.periodStart),
    periodEnd: fromFirestoreDate(data.periodEnd),
    grossPay: Number(data.grossPay),
    deductions: Number(data.deductions),
    netPay: Number(data.netPay),
    status: data.status as PayrollEntry['status'],
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapNotification(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    orgId: String(data.orgId),
    userId: String(data.userId),
    title: String(data.title),
    body: String(data.body),
    type: data.type as AppNotification['type'],
    read: Boolean(data.read),
    createdAt: fromFirestoreDate(data.createdAt),
  };
}

export class FirestoreCustomerRepository implements CustomerRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.customers, orgId);
    return docs.map((d) => mapCustomer(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.customers, orgId, id);
    return doc ? mapCustomer(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<Customer, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.customers, orgId, data);
    return mapCustomer(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.customers, orgId, id, data);
    return mapCustomer(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.customers, orgId, id);
  }
}

export class FirestoreVehicleRepository implements VehicleRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.vehicles, orgId);
    return docs.map((d) => mapVehicle(d.id, d.data));
  }
  async listByCustomer(orgId: string, customerId: string) {
    const all = await this.listByOrg(orgId);
    return all.filter((v) => v.customerId === customerId);
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.vehicles, orgId, id);
    return doc ? mapVehicle(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<Vehicle, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.vehicles, orgId, data);
    return mapVehicle(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Omit<Vehicle, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.vehicles, orgId, id, data);
    return mapVehicle(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.vehicles, orgId, id);
  }
}

export class FirestoreVehicleTaskRepository implements VehicleTaskRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.vehicleTasks, orgId);
    return docs.map((d) => mapTask(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.vehicleTasks, orgId, id);
    return doc ? mapTask(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<VehicleTask, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.vehicleTasks, orgId, data);
    return mapTask(id, saved);
  }
  async updateStatus(orgId: string, id: string, status: VehicleTaskStatus) {
    const saved = await updateOrgDoc(COLLECTIONS.vehicleTasks, orgId, id, { status });
    return mapTask(id, saved);
  }
  async assignMechanic(orgId: string, id: string, mechanicId: string | null) {
    const saved = await updateOrgDoc(COLLECTIONS.vehicleTasks, orgId, id, {
      assignedMechanicId: mechanicId,
    });
    return mapTask(id, saved);
  }
}

export class FirestoreInventoryRepository implements InventoryRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.inventoryItems, orgId);
    return docs.map((d) => mapInventory(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.inventoryItems, orgId, id);
    return doc ? mapInventory(doc.id, doc.data) : null;
  }
  async create(
    orgId: string,
    data: Omit<InventoryItem, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.inventoryItems, orgId, data);
    return mapInventory(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Omit<InventoryItem, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.inventoryItems, orgId, id, data);
    return mapInventory(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.inventoryItems, orgId, id);
  }
}

export class FirestoreEmployeeRepository implements EmployeeRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.employees, orgId);
    return docs.map((d) => mapEmployee(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.employees, orgId, id);
    return doc ? mapEmployee(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<Employee, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.employees, orgId, {
      ...data,
      hireDate: data.hireDate,
    });
    return mapEmployee(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Omit<Employee, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.employees, orgId, id, data);
    return mapEmployee(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.employees, orgId, id);
  }
}

export class FirestoreMechanicRepository implements MechanicRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.mechanics, orgId);
    return docs.map((d) => mapMechanic(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.mechanics, orgId, id);
    return doc ? mapMechanic(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<Mechanic, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.mechanics, orgId, data);
    return mapMechanic(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Omit<Mechanic, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.mechanics, orgId, id, data);
    return mapMechanic(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.mechanics, orgId, id);
  }
}

export class FirestorePosOrderRepository implements PosOrderRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.posOrders, orgId);
    return docs.map((d) => mapPosOrder(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.posOrders, orgId, id);
    return doc ? mapPosOrder(doc.id, doc.data) : null;
  }
  async create(orgId: string, data: Omit<PosOrder, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.posOrders, orgId, data);
    return mapPosOrder(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Pick<PosOrder, 'status' | 'paymentMethod'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.posOrders, orgId, id, data);
    return mapPosOrder(id, saved);
  }
}

export class FirestorePayrollRepository implements PayrollRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.payrollEntries, orgId);
    return docs.map((d) => mapPayroll(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.payrollEntries, orgId, id);
    return doc ? mapPayroll(doc.id, doc.data) : null;
  }
  async create(
    orgId: string,
    data: Omit<PayrollEntry, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.payrollEntries, orgId, data);
    return mapPayroll(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Pick<PayrollEntry, 'status' | 'grossPay' | 'deductions' | 'netPay'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.payrollEntries, orgId, id, data);
    return mapPayroll(id, saved);
  }
}

export class FirestoreNotificationRepository implements NotificationRepository {
  async listByUser(orgId: string, userId: string) {
    const docs = await listOrgDocs(COLLECTIONS.notifications, orgId);
    return docs.map((d) => mapNotification(d.id, d.data)).filter((n) => n.userId === userId);
  }
  async create(data: Omit<AppNotification, 'id' | 'createdAt'>) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.notifications, data.orgId, data);
    return mapNotification(id, saved);
  }
  async markRead(orgId: string, userId: string, id: string) {
    const existing = await getOrgDoc(COLLECTIONS.notifications, orgId, id);
    if (!existing || existing.data.userId !== userId) throw new Error('Not found');
    await updateOrgDoc(COLLECTIONS.notifications, orgId, id, { read: true });
  }
  async markAllRead(orgId: string, userId: string) {
    const items = await this.listByUser(orgId, userId);
    await Promise.all(items.filter((n) => !n.read).map((n) => this.markRead(orgId, userId, n.id)));
  }
}

export class FirestoreAnalyticsRepository implements AnalyticsRepository {
  constructor(
    private readonly customerRepo: FirestoreCustomerRepository,
    private readonly vehicleRepo: FirestoreVehicleRepository,
    private readonly taskRepo: FirestoreVehicleTaskRepository,
    private readonly inventoryRepo: FirestoreInventoryRepository,
    private readonly employeeRepo: FirestoreEmployeeRepository,
    private readonly mechanicRepo: FirestoreMechanicRepository,
    private readonly posRepo: FirestorePosOrderRepository,
    private readonly payrollRepo: FirestorePayrollRepository,
  ) {}

  async getWorkshopMetrics(orgId: string): Promise<WorkshopAnalytics> {
    const [customers, vehicles, tasks, inventory, employees, mechanics, orders, payroll] =
      await Promise.all([
        this.customerRepo.listByOrg(orgId),
        this.vehicleRepo.listByOrg(orgId),
        this.taskRepo.listByOrg(orgId),
        this.inventoryRepo.listByOrg(orgId),
        this.employeeRepo.listByOrg(orgId),
        this.mechanicRepo.listByOrg(orgId),
        this.posRepo.listByOrg(orgId),
        this.payrollRepo.listByOrg(orgId),
      ]);

    const activeTaskCount = tasks.filter((t) => t.status !== 'completed').length;
    const completedTaskCount = tasks.filter((t) => t.status === 'completed').length;
    const lowStockCount = inventory.filter((i) => i.quantity <= i.reorderLevel).length;
    const paidOrders = orders.filter((o) => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingPayrollCount = payroll.filter((p) => p.status !== 'paid').length;

    return {
      customerCount: customers.length,
      vehicleCount: vehicles.length,
      activeTaskCount,
      completedTaskCount,
      inventoryItemCount: inventory.length,
      lowStockCount,
      employeeCount: employees.length,
      mechanicCount: mechanics.length,
      paidOrderCount: paidOrders.length,
      totalRevenue,
      pendingPayrollCount,
    };
  }
}
