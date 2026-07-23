import type {
  AnalyticsRepository,
  CustomerRepository,
  EmployeeRepository,
  InventoryRepository,
  MechanicRepository,
  MechanicSalesRecordRepository,
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
  InventoryCategory,
  InventoryItem,
  Mechanic,
  MechanicSalesRecord,
  MechanicSalesRecordItem,
  PayrollEntry,
  PaymentMethod,
  PosOrder,
  PosOrderItem,
  PosOrderStatus,
  PosBuyerType,
  Vehicle,
  VehicleTask,
  VehicleTaskStatus,
  WorkshopAnalytics,
  WorkshopService,
} from '@car-spa/domain';
import { WORKSHOP_SERVICES, normalizeVehicleTaskStatus } from '@car-spa/domain';
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
  const hasStructuredVehicle =
    data.vehicleBrand != null || data.vehicleModel != null || data.vehicleNumber != null;
  const legacyVehicle = data.vehicle ? String(data.vehicle) : '';

  return {
    id,
    orgId: String(data.orgId),
    taskCode: String(data.taskCode),
    vehicleBrand: hasStructuredVehicle ? String(data.vehicleBrand ?? '') : legacyVehicle,
    vehicleModel: hasStructuredVehicle ? String(data.vehicleModel ?? '') : '',
    vehicleNumber: hasStructuredVehicle ? String(data.vehicleNumber ?? '') : '',
    customerId: String(data.customerId),
    services: Array.isArray(data.services)
      ? data.services.filter(
          (service): service is WorkshopService =>
            typeof service === 'string' && WORKSHOP_SERVICES.includes(service as WorkshopService),
        )
      : [],
    paymentMethod: data.paymentMethod ? (data.paymentMethod as PaymentMethod) : null,
    amount: data.amount != null ? Number(data.amount) : null,
    advancePayment: data.advancePayment != null ? Number(data.advancePayment) : null,
    problemStatement: data.problemStatement ? String(data.problemStatement) : null,
    description: data.description ? String(data.description) : null,
    status: normalizeVehicleTaskStatus(data.status),
    assignedMechanicId: data.assignedMechanicId ? String(data.assignedMechanicId) : null,
    estimatedCompletion: data.estimatedCompletion
      ? fromFirestoreDate(data.estimatedCompletion)
      : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapInventoryCategory(id: string, data: Record<string, unknown>): InventoryCategory {
  const fields = Array.isArray(data.fields)
    ? data.fields.map((field) => {
        const raw = field as Record<string, unknown>;
        return {
          key: String(raw.key),
          label: String(raw.label),
          type: raw.type as InventoryCategory['fields'][number]['type'],
          required: Boolean(raw.required),
          options: Array.isArray(raw.options) ? raw.options.map(String) : undefined,
        };
      })
    : [];

  return {
    id,
    orgId: String(data.orgId),
    name: String(data.name),
    fields,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapInventory(id: string, data: Record<string, unknown>): InventoryItem {
  const attributes =
    data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)
      ? Object.fromEntries(
          Object.entries(data.attributes as Record<string, unknown>).map(([key, value]) => [
            key,
            typeof value === 'number' ? value : String(value),
          ]),
        )
      : {};

  return {
    id,
    orgId: String(data.orgId),
    categoryId: String(data.categoryId ?? data.category ?? ''),
    sku: String(data.sku),
    name: String(data.name),
    attributes,
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
    name: data.name ? String(data.name) : 'Mechanic',
    storeName: data.storeName ? String(data.storeName) : '',
    phone: data.phone ? String(data.phone) : '',
    contactName: data.contactName ? String(data.contactName) : null,
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapMechanicSalesRecord(id: string, data: Record<string, unknown>): MechanicSalesRecord {
  const items = Array.isArray(data.items)
    ? data.items.map((item) => {
        const raw = item as Record<string, unknown>;
        return {
          inventoryItemId: raw.inventoryItemId ? String(raw.inventoryItemId) : null,
          description: String(raw.description),
          quantity: Number(raw.quantity),
        } satisfies MechanicSalesRecordItem;
      })
    : [];

  return {
    id,
    orgId: String(data.orgId),
    mechanicId: String(data.mechanicId),
    fromDate: fromFirestoreDate(data.fromDate),
    toDate: fromFirestoreDate(data.toDate),
    items,
    totalAmount: Number(data.totalAmount),
    createdAt: fromFirestoreDate(data.createdAt),
    updatedAt: fromFirestoreDate(data.updatedAt),
  };
}

function mapPosOrder(id: string, data: Record<string, unknown>): PosOrder {
  const items = Array.isArray(data.items)
    ? data.items.map((item) => {
        const raw = item as Record<string, unknown>;
        return {
          inventoryItemId: raw.inventoryItemId ? String(raw.inventoryItemId) : null,
          description: String(raw.description),
          quantity: Number(raw.quantity),
          unitPrice: Number(raw.unitPrice),
          lineTotal: Number(raw.lineTotal ?? Number(raw.quantity) * Number(raw.unitPrice)),
        } satisfies PosOrderItem;
      })
    : [];

  const buyerType = (data.buyerType as PosBuyerType) ?? (data.customerId ? 'customer' : 'walk_in');

  return {
    id,
    orgId: String(data.orgId),
    buyerType,
    mechanicId: data.mechanicId ? String(data.mechanicId) : null,
    customerId: data.customerId ? String(data.customerId) : null,
    buyerName: data.buyerName ? String(data.buyerName) : null,
    buyerContact: data.buyerContact ? String(data.buyerContact) : null,
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
  async update(
    orgId: string,
    id: string,
    data: Pick<
      VehicleTask,
      | 'vehicleBrand'
      | 'vehicleModel'
      | 'vehicleNumber'
      | 'customerId'
      | 'services'
      | 'paymentMethod'
      | 'amount'
      | 'advancePayment'
    >,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.vehicleTasks, orgId, id, data);
    return mapTask(id, saved);
  }
  async updatePayment(
    orgId: string,
    id: string,
    data: Pick<VehicleTask, 'paymentMethod' | 'amount' | 'advancePayment'>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.vehicleTasks, orgId, id, data);
    return mapTask(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.vehicleTasks, orgId, id);
  }
}

export class FirestoreInventoryCategoryRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.inventoryCategories, orgId);
    return docs.map((d) => mapInventoryCategory(d.id, d.data));
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.inventoryCategories, orgId, id);
    return doc ? mapInventoryCategory(doc.id, doc.data) : null;
  }
  async create(
    orgId: string,
    data: Omit<InventoryCategory, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.inventoryCategories, orgId, data);
    return mapInventoryCategory(id, saved);
  }
  async update(
    orgId: string,
    id: string,
    data: Partial<Omit<InventoryCategory, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ) {
    const saved = await updateOrgDoc(COLLECTIONS.inventoryCategories, orgId, id, data);
    return mapInventoryCategory(id, saved);
  }
  async delete(orgId: string, id: string) {
    await deleteOrgDoc(COLLECTIONS.inventoryCategories, orgId, id);
  }
}

export class FirestoreInventoryRepository implements InventoryRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.inventoryItems, orgId);
    return docs.map((d) => mapInventory(d.id, d.data));
  }
  async listByCategory(orgId: string, categoryId: string) {
    const all = await this.listByOrg(orgId);
    return all.filter((item) => item.categoryId === categoryId);
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
  async adjustQuantity(orgId: string, id: string, delta: number) {
    const item = await this.findById(orgId, id);
    if (!item) throw new Error('Inventory item not found');
    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 0) {
      throw new Error(`Insufficient stock for ${item.name}`);
    }
    const saved = await updateOrgDoc(COLLECTIONS.inventoryItems, orgId, id, {
      quantity: nextQuantity,
    });
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

export class FirestoreMechanicSalesRecordRepository implements MechanicSalesRecordRepository {
  async listByOrg(orgId: string) {
    const docs = await listOrgDocs(COLLECTIONS.mechanicSalesRecords, orgId);
    return docs.map((d) => mapMechanicSalesRecord(d.id, d.data));
  }
  async listByMechanic(orgId: string, mechanicId: string) {
    const all = await this.listByOrg(orgId);
    return all.filter((record) => record.mechanicId === mechanicId);
  }
  async findById(orgId: string, id: string) {
    const doc = await getOrgDoc(COLLECTIONS.mechanicSalesRecords, orgId, id);
    return doc ? mapMechanicSalesRecord(doc.id, doc.data) : null;
  }
  async create(
    orgId: string,
    data: Omit<MechanicSalesRecord, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ) {
    const { id, data: saved } = await addOrgDoc(COLLECTIONS.mechanicSalesRecords, orgId, {
      ...data,
      fromDate: data.fromDate,
      toDate: data.toDate,
    });
    return mapMechanicSalesRecord(id, saved);
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

    const activeTaskCount = tasks.filter(
      (task) => task.status === 'todo' || task.status === 'in_progress',
    ).length;
    const completedTaskCount = tasks.filter((task) => task.status === 'ready_for_pickup').length;
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
