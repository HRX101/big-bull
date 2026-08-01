import type {
  AuditLogEntry,
  AuthSession,
  Category,
  Customer,
  Product,
  LeaveRequest,
  Mechanic,
  MechanicLedgerEntry,
  Membership,
  NotificationLog,
  Organization,
  POSSale,
  SalaryRecord,
  SerializedItem,
  Service,
  StockMovement,
  StoreSettings,
  Supplier,
  TaskDraft,
  TaskStatusEvent,
  UserProfile,
  Vehicle,
  VehicleTask,
} from '@car-spa/domain';
import type { LeaveStatus, PaymentMode, SalaryStatus, StockMovementType, TaskStatus, UserRole } from '@car-spa/shared';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthRepository {
  signIn(credentials: AuthCredentials): Promise<AuthSession>;
  signUp(data: SignUpData): Promise<AuthSession>;
  signInWithGoogle(): Promise<AuthSession>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(data: { name: string; slug: string }): Promise<Organization>;
}

export interface MembershipRepository {
  findByUserId(userId: string): Promise<Membership | null>;
  findByOrgId(orgId: string): Promise<Membership[]>;
  create(data: {
    userId: string;
    orgId: string;
    role: UserRole;
    salaryAmount?: number | null;
    minWorkDays?: number | null;
  }): Promise<Membership>;
  update(
    id: string,
    data: {
      role?: UserRole;
      active?: boolean;
      salaryAmount?: number | null;
      minWorkDays?: number | null;
    },
  ): Promise<Membership>;
}

export interface UserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByOrgId(orgId: string): Promise<UserProfile[]>;
  upsert(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<UserProfile>;
  update(id: string, data: Partial<UserProfile>): Promise<UserProfile>;
}

export interface ClaimsService {
  syncClaims(userId: string, orgId: string, role: UserRole): Promise<void>;
}

export interface AuditRepository {
  log(entry: {
    orgId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  findByOrgId(orgId: string, options?: { limit?: number }): Promise<AuditLogEntry[]>;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByPhone(orgId: string, phone: string): Promise<Customer | null>;
  findByOrgId(orgId: string, options?: { limit?: number; offset?: string }): Promise<Customer[]>;
  search(orgId: string, query: string): Promise<Customer[]>;
  create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer>;
  update(id: string, data: Partial<Customer>): Promise<Customer>;
}

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findByCustomerId(customerId: string): Promise<Vehicle[]>;
  findByOrgId(orgId: string): Promise<Vehicle[]>;
  findByNumber(orgId: string, vehicleNumber: string): Promise<Vehicle | null>;
  create(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
  findByOrgId(orgId: string): Promise<Service[]>;
  create(data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
}

export interface VehicleTaskRepository {
  findById(id: string): Promise<VehicleTask | null>;
  findByOrgId(
    orgId: string,
    options?: { status?: TaskStatus; limit?: number; offset?: string },
  ): Promise<VehicleTask[]>;
  create(data: Omit<VehicleTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleTask>;
  update(id: string, data: Partial<VehicleTask>): Promise<VehicleTask>;
  getCountByStatus(orgId: string): Promise<Record<TaskStatus, number>>;
}

export interface TaskStatusEventRepository {
  findByTaskId(taskId: string): Promise<TaskStatusEvent[]>;
  create(data: Omit<TaskStatusEvent, 'id' | 'createdAt'>): Promise<TaskStatusEvent>;
  updateWhatsAppStatus(id: string, status: TaskStatusEvent['whatsappStatus']): Promise<void>;
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByOrgId(orgId: string): Promise<Category[]>;
  findByCodePrefix(orgId: string, prefix: string): Promise<Category | null>;
  getNextSequence(orgId: string, prefix: string): Promise<number>;
  create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  update(id: string, data: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByCategoryId(categoryId: string): Promise<Product[]>;
  findByOrgId(orgId: string): Promise<Product[]>;
  search(orgId: string, query: string): Promise<Product[]>;
  findBySku(sku: string): Promise<Product | null>;
  create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, data: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
  updateCurrentStock(id: string, quantity: number): Promise<void>;
  getLowStock(orgId: string, threshold: number): Promise<Product[]>;
  getStockValue(orgId: string): Promise<{ total: number; byCategory: Record<string, number> }>;
  getTopSelling(orgId: string, days: number, limit: number): Promise<Array<{ productId: string; name: string; sku: string; totalSold: number }>>;
  getSlowMoving(orgId: string, days: number): Promise<Product[]>;
  bulkCreate(data: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product[]>;
}

export interface StockMovementRepository {
  findByProductId(productId: string): Promise<StockMovement[]>;
  findByOrgId(orgId: string, options?: { limit?: number; productId?: string }): Promise<StockMovement[]>;
  create(data: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement>;
  getDerivedStock(productId: string): Promise<number>;
}

export interface SupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findByOrgId(orgId: string): Promise<Supplier[]>;
  findByPhone(orgId: string, phone: string): Promise<Supplier | null>;
  create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier>;
  update(id: string, data: Partial<Supplier>): Promise<Supplier>;
  delete(id: string): Promise<void>;
}

export interface POSSaleRepository {
  findById(id: string): Promise<POSSale | null>;
  findByOrgId(orgId: string, options?: { limit?: number; offset?: string }): Promise<POSSale[]>;
  create(data: Omit<POSSale, 'id' | 'createdAt'>): Promise<POSSale>;
  getDailyTotal(orgId: string): Promise<number>;
  getMonthlyTotal(orgId: string): Promise<number>;
}

export interface MechanicRepository {
  findById(id: string): Promise<Mechanic | null>;
  findByOrgId(orgId: string): Promise<Mechanic[]>;
  create(data: Omit<Mechanic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mechanic>;
  update(id: string, data: Partial<Mechanic>): Promise<Mechanic>;
  delete(id: string): Promise<void>;
  updateBalance(id: string, delta: number): Promise<Mechanic>;
}

export interface MechanicLedgerRepository {
  findByMechanicId(mechanicId: string): Promise<MechanicLedgerEntry[]>;
  findByOrgId(orgId: string): Promise<MechanicLedgerEntry[]>;
  create(data: Omit<MechanicLedgerEntry, 'id' | 'createdAt'>): Promise<MechanicLedgerEntry>;
}

export interface LeaveRequestRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByOrgId(orgId: string): Promise<LeaveRequest[]>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest>;
  update(
    id: string,
    data: { status: LeaveStatus; reviewedBy: string; reviewedAt: Date },
  ): Promise<LeaveRequest>;
  getPendingCount(orgId: string): Promise<number>;
}

export interface SalaryRecordRepository {
  findById(id: string): Promise<SalaryRecord | null>;
  findByOrgId(orgId: string): Promise<SalaryRecord[]>;
  findByEmployeeId(employeeId: string): Promise<SalaryRecord[]>;
  create(data: Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalaryRecord>;
  update(id: string, data: Partial<SalaryRecord>): Promise<SalaryRecord>;
  getPendingCount(orgId: string): Promise<number>;
}

export interface StoreSettingsRepository {
  findByOrgId(orgId: string): Promise<StoreSettings | null>;
  upsert(data: Omit<StoreSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoreSettings>;
}

export interface NotificationRepository {
  findById(id: string): Promise<NotificationLog | null>;
  findByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<NotificationLog[]>;
  create(data: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog>;
  update(id: string, data: Partial<NotificationLog>): Promise<NotificationLog>;
  getFailedNotifications(orgId: string): Promise<NotificationLog[]>;
}

export interface DraftRepository {
  findByUserAndType(userId: string, type: string): Promise<TaskDraft | null>;
  upsert(data: Omit<TaskDraft, 'id'>): Promise<TaskDraft>;
  delete(id: string): Promise<void>;
}

export interface SerializedItemRepository {
  findByProductId(productId: string): Promise<SerializedItem[]>;
  findByOrgId(orgId: string): Promise<SerializedItem[]>;
  findAvailableByProductId(productId: string): Promise<SerializedItem[]>;
  create(data: Omit<SerializedItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SerializedItem>;
  bulkCreate(data: Array<Omit<SerializedItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SerializedItem[]>;
  createSerializedRestock(input: {
    orgId: string;
    productId: string;
    serialNumbers: string[];
    note?: string;
    actorId: string;
  }): Promise<{ items: SerializedItem[]; movementId: string }>;
  update(id: string, data: Partial<SerializedItem>): Promise<SerializedItem>;
  delete(id: string): Promise<void>;
}
