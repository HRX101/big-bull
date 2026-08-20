import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const bootstrapOrgSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-]{10,15}$/, 'Enter a valid phone number (10-15 digits)');

export const indianVehiclePlateSchema = z
  .string()
  .regex(
    /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{1,4}$/i,
    'Enter a valid vehicle number (e.g. WB 26F 9596)',
  );

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

export const vehicleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  vehicleNumber: indianVehiclePlateSchema,
  type: z.enum(['car', 'bike', 'truck', 'bus', 'other']),
});

export const vehicleTaskCreateSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']),
  totalAmount: z.number().positive('Amount must be positive'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative'),
  notes: z.string().optional().or(z.literal('')),
});

export const taskStatusChangeSchema = z.object({
  taskId: z.string().min(1),
  toStatus: z.enum(['RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED']),
  note: z.string().min(1, 'Note is required when changing status'),
});

export const recordPaymentSchema = z.object({
  taskId: z.string().min(1),
  amount: z.number().positive('Payment amount must be positive'),
});

export const attributeDefinitionSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[a-z_]+$/, 'Use lowercase with underscores'),
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['text', 'number', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  codePrefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(5, 'Prefix must be at most 5 characters')
    .regex(/^[A-Z]+$/, 'Use uppercase letters only'),
  attributeSchema: z.array(attributeDefinitionSchema).default([]),
  productNames: z.array(z.string()).default([]),
  lowStockThresholdDefault: z.number().min(0).default(5),
  hasExpiry: z.boolean().default(false),
});

export const productSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Product name is required'),
  attributeValues: z.record(z.unknown()).default({}),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  unit: z.string().min(1, 'Unit of measurement is required'),
  lowStockThreshold: z.number().min(0).default(5),
  initialStock: z.number().min(0).default(0),
  expiryDate: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  supplierId: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  type: z.enum(['RESTOCK_IN', 'MANUAL_OUT', 'POS_SALE', 'VEHICLE_TASK_USE', 'MECHANIC_ISSUE']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  note: z.string().min(1, 'Note is required'),
  referenceId: z.string().optional().or(z.literal('')),
  supplierId: z.string().optional().or(z.literal('')),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPhone: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  toBePaid: z.number().min(0).default(0),
  advanceAmount: z.number().min(0).default(0),
});

export const supplierPurchaseEntrySchema = z.object({
  supplierId: z.string().min(1),
  type: z.enum(['PURCHASE', 'ADVANCE']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
});

export const posSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        itemId: z.string().optional().or(z.literal('')),
        itemName: z.string().optional().or(z.literal('')),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().min(0),
        serialNumbers: z.array(z.string()).optional(),
      }),
    )
    .min(1, 'At least one item is required'),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']),
});

export const mechanicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  storeName: z.string().min(1, 'Store name is required'),
  phone: phoneSchema.optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

export const mechanicLedgerEntrySchema = z.object({
  mechanicId: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  itemCount: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
      }),
    )
    .optional(),
});

export const leaveRequestSchema = z.object({
  fromDate: z.string().min(1, 'Start date is required'),
  toDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional().or(z.literal('')),
  leaveType: z.enum(['UNPAID', 'PAID', 'SICK']).default('UNPAID'),
});

export const salaryRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  fullSalary: z.number().positive('Salary must be positive'),
  workingDays: z.number().positive('Working days must be positive'),
  leaveDays: z.number().min(0, 'Leave days cannot be negative'),
  perDayRate: z.number().positive('Per day rate must be positive').optional(),
  deduction: z.number().min(0, 'Deduction cannot be negative').optional(),
  payableAmount: z.number().min(0, 'Payable amount cannot be negative').optional(),
  notes: z.string().optional().or(z.literal('')),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  address: z.string().optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  taxRate: z.number().min(0).max(100).default(0),
  logoUrl: z.string().optional().or(z.literal('')),
  whatsappProvider: z.enum(['META', 'TWILIO', 'WASENDER', 'NONE']).default('NONE'),
  whatsappApiKey: z.string().optional().or(z.literal('')),
  whatsappPhoneNumberId: z.string().optional().or(z.literal('')),
  whatsappTemplateId: z.string().optional().or(z.literal('')),
  whatsappTwilioFromNumber: z.string().optional().or(z.literal('')),
  workingDaysPerMonth: z.number().min(1).max(31).default(26),
  defaultLeaveType: z.enum(['UNPAID', 'PAID']).default('UNPAID'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type BootstrapOrgInput = z.infer<typeof bootstrapOrgSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleTaskCreateInput = z.infer<typeof vehicleTaskCreateSchema>;
export type TaskStatusChangeInput = z.infer<typeof taskStatusChangeSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type InventoryCategoryInput = z.infer<typeof categorySchema>;
export type InventoryItemInput = z.infer<typeof productSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type POSSaleInput = z.infer<typeof posSaleSchema>;
export type MechanicInput = z.infer<typeof mechanicSchema>;
export type MechanicLedgerEntryInput = z.infer<typeof mechanicLedgerEntrySchema>;
export type SupplierPurchaseEntryInput = z.infer<typeof supplierPurchaseEntrySchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type SalaryRecordInput = z.infer<typeof salaryRecordSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
