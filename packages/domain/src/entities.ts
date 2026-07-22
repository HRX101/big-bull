import type { UserRole } from '@car-spa/shared';
import type { VehicleTaskStatus, WorkshopService } from './vehicle-task';

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
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  orgId: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string | null;
  vin: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  other: 'Other',
};

export interface VehicleTask {
  id: string;
  orgId: string;
  taskCode: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleNumber: string;
  customerId: string;
  services: WorkshopService[];
  paymentMethod: PaymentMethod | null;
  amount: number | null;
  advancePayment: number | null;
  problemStatement: string | null;
  description: string | null;
  status: VehicleTaskStatus;
  assignedMechanicId: string | null;
  estimatedCompletion: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  orgId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  status: EmployeeStatus;
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mechanic {
  id: string;
  orgId: string;
  employeeId: string;
  specializations: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PosOrderStatus = 'draft' | 'paid' | 'cancelled';

export interface PosOrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PosOrder {
  id: string;
  orgId: string;
  customerId: string | null;
  vehicleTaskId: string | null;
  items: PosOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: PosOrderStatus;
  paymentMethod: PaymentMethod | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PayrollStatus = 'draft' | 'approved' | 'paid';

export interface PayrollEntry {
  id: string;
  orgId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 'info' | 'warning' | 'success' | 'task';

export interface AppNotification {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
}

export interface WorkshopAnalytics {
  customerCount: number;
  vehicleCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  inventoryItemCount: number;
  lowStockCount: number;
  employeeCount: number;
  mechanicCount: number;
  paidOrderCount: number;
  totalRevenue: number;
  pendingPayrollCount: number;
}
