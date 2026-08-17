import type { LeaveStatus, PaymentMode, SalaryStatus, TaskStatus, UserRole } from '@car-spa/shared';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: UserRole;
  salaryAmount: number | null;
  minWorkDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  emailVerified: boolean;
  orgId: string | null;
  role: UserRole | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  totalSpend: number;
  visitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  orgId: string;
  customerId: string;
  brand: string;
  model: string;
  vehicleNumber: string;
  type: 'car' | 'bike' | 'truck' | 'bus' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleTask {
  id: string;
  orgId: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  status: TaskStatus;
  paymentMode: PaymentMode;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'FULL';
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes: string | null;
  assignedTo: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskStatusEvent {
  id: string;
  orgId: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  note: string;
  actorId: string;
  whatsappStatus: 'PENDING' | 'SENT' | 'FAILED' | 'NOT_APPLICABLE';
  createdAt: Date;
}

export interface AttributeDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
}

export interface Category {
  id: string;
  orgId: string;
  name: string;
  codePrefix: string;
  attributeSchema: AttributeDefinition[];
  productNames: string[];
  lowStockThresholdDefault: number;
  hasExpiry: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  orgId: string;
  categoryId: string;
  sku: string;
  name: string;
  attributeValues: Record<string, unknown>;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  lowStockThreshold: number;
  currentStock: number;
  expiryDate: Date | null;
  imageUrl: string | null;
  supplierId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StockMovementType = 'RESTOCK_IN' | 'MANUAL_OUT' | 'POS_SALE' | 'VEHICLE_TASK_USE';

export interface StockMovement {
  id: string;
  orgId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  note: string;
  referenceId: string | null;
  supplierId: string | null;
  actorId: string;
  serialNumbers: string[] | null;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactPhone: string | null;
  notes: string | null;
  totalAmount: number;
  advanceAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierPurchaseEntry {
  id: string;
  orgId: string;
  supplierId: string;
  type: 'PURCHASE' | 'ADVANCE';
  amount: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string;
  createdAt: Date;
}

export interface POSSale {
  id: string;
  orgId: string;
  customerId: string | null;
  items: POSSaleItem[];
  totalAmount: number;
  paymentMode: PaymentMode;
  receiptNumber: string;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface POSSaleItem {
  id: string;
  saleId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumbers: string[] | null;
}

export interface Mechanic {
  id: string;
  orgId: string;
  name: string;
  storeName: string;
  phone: string | null;
  address: string | null;
  balance: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MechanicLedgerEntry {
  id: string;
  orgId: string;
  mechanicId: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  itemCount: number | null;
  actorId: string;
  createdAt: Date;
}

export interface LeaveRequest {
  id: string;
  orgId: string;
  employeeId: string;
  fromDate: Date;
  toDate: Date;
  reason: string | null;
  status: LeaveStatus;
  leaveType: 'UNPAID' | 'PAID' | 'SICK';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryRecord {
  id: string;
  orgId: string;
  employeeId: string;
  month: number;
  year: number;
  fullSalary: number;
  workingDays: number;
  leaveDays: number;
  perDayRate: number;
  deduction: number;
  payableAmount: number;
  status: SalaryStatus;
  receiptUrl: string | null;
  notes: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreSettings {
  id: string;
  orgId: string;
  storeName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  taxRate: number;
  logoUrl: string | null;
  whatsappProvider: 'META' | 'TWILIO' | 'WASENDER' | 'NONE';
  whatsappApiKey: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappTemplateId: string | null;
  whatsappTwilioFromNumber: string | null;
  workingDaysPerMonth: number;
  defaultLeaveType: 'UNPAID' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  orgId: string;
  type: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  templateId: string | null;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error: string | null;
  referenceType: string;
  referenceId: string;
  retryCount: number;
  createdAt: Date;
}

export interface SerializedItem {
  id: string;
  orgId: string;
  productId: string;
  serialNumber: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDraft {
  id: string;
  orgId: string;
  userId: string;
  step: number;
  data: Record<string, unknown>;
  updatedAt: Date;
}
