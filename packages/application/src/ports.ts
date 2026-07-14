import type {
  AppNotification,
  AuditLogEntry,
  AuthSession,
  Customer,
  Employee,
  InventoryItem,
  Mechanic,
  Membership,
  Organization,
  PayrollEntry,
  PosOrder,
  UserProfile,
  Vehicle,
  VehicleTask,
  VehicleTaskStatus,
  WorkshopAnalytics,
} from '@car-spa/domain';
import type { UserRole } from '@car-spa/shared';

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
  applyEmailVerification(actionCode: string): Promise<void>;
  inspectActionCode(actionCode: string): Promise<string>;
  verifyPasswordResetCode(actionCode: string): Promise<string>;
  confirmPasswordReset(actionCode: string, newPassword: string): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  subscribe(callback: (session: AuthSession | null) => void): () => void;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(data: { name: string; slug: string }): Promise<Organization>;
}

export interface MembershipRepository {
  findByUserId(userId: string): Promise<Membership | null>;
  create(data: { userId: string; orgId: string; role: UserRole }): Promise<Membership>;
}

export interface UserRepository {
  findById(id: string): Promise<UserProfile | null>;
  upsert(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<UserProfile>;
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
  listByOrg(orgId: string, limit?: number): Promise<AuditLogEntry[]>;
}

export interface CustomerRepository {
  listByOrg(orgId: string): Promise<Customer[]>;
  findById(orgId: string, id: string): Promise<Customer | null>;
  create(
    orgId: string,
    data: Omit<Customer, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Customer>;
  update(
    orgId: string,
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'notes'>>,
  ): Promise<Customer>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface VehicleRepository {
  listByOrg(orgId: string): Promise<Vehicle[]>;
  listByCustomer(orgId: string, customerId: string): Promise<Vehicle[]>;
  findById(orgId: string, id: string): Promise<Vehicle | null>;
  create(
    orgId: string,
    data: Omit<Vehicle, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Vehicle>;
  update(
    orgId: string,
    id: string,
    data: Partial<Omit<Vehicle, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Vehicle>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface VehicleTaskRepository {
  listByOrg(orgId: string): Promise<VehicleTask[]>;
  findById(orgId: string, id: string): Promise<VehicleTask | null>;
  create(
    orgId: string,
    data: Omit<VehicleTask, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<VehicleTask>;
  updateStatus(orgId: string, id: string, status: VehicleTaskStatus): Promise<VehicleTask>;
  assignMechanic(orgId: string, id: string, mechanicId: string | null): Promise<VehicleTask>;
}

export interface InventoryRepository {
  listByOrg(orgId: string): Promise<InventoryItem[]>;
  findById(orgId: string, id: string): Promise<InventoryItem | null>;
  create(
    orgId: string,
    data: Omit<InventoryItem, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<InventoryItem>;
  update(
    orgId: string,
    id: string,
    data: Partial<Omit<InventoryItem, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<InventoryItem>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface EmployeeRepository {
  listByOrg(orgId: string): Promise<Employee[]>;
  findById(orgId: string, id: string): Promise<Employee | null>;
  create(
    orgId: string,
    data: Omit<Employee, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Employee>;
  update(
    orgId: string,
    id: string,
    data: Partial<Omit<Employee, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Employee>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface MechanicRepository {
  listByOrg(orgId: string): Promise<Mechanic[]>;
  findById(orgId: string, id: string): Promise<Mechanic | null>;
  create(
    orgId: string,
    data: Omit<Mechanic, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Mechanic>;
  update(
    orgId: string,
    id: string,
    data: Partial<Omit<Mechanic, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Mechanic>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface PosOrderRepository {
  listByOrg(orgId: string): Promise<PosOrder[]>;
  findById(orgId: string, id: string): Promise<PosOrder | null>;
  create(
    orgId: string,
    data: Omit<PosOrder, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<PosOrder>;
  update(
    orgId: string,
    id: string,
    data: Partial<Pick<PosOrder, 'status' | 'paymentMethod'>>,
  ): Promise<PosOrder>;
}

export interface PayrollRepository {
  listByOrg(orgId: string): Promise<PayrollEntry[]>;
  findById(orgId: string, id: string): Promise<PayrollEntry | null>;
  create(
    orgId: string,
    data: Omit<PayrollEntry, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<PayrollEntry>;
  update(
    orgId: string,
    id: string,
    data: Partial<Pick<PayrollEntry, 'status' | 'grossPay' | 'deductions' | 'netPay'>>,
  ): Promise<PayrollEntry>;
}

export interface NotificationRepository {
  listByUser(orgId: string, userId: string): Promise<AppNotification[]>;
  create(data: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification>;
  markRead(orgId: string, userId: string, id: string): Promise<void>;
  markAllRead(orgId: string, userId: string): Promise<void>;
}

export interface AnalyticsRepository {
  getWorkshopMetrics(orgId: string): Promise<WorkshopAnalytics>;
}

export interface ReceiptService {
  generateReceipt(orderId: string, orgId: string): Promise<{ receiptId: string; html: string }>;
}
