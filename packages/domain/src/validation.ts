import { z } from 'zod';
import { isValidIndianMobile } from './phone';
import { VEHICLE_TASK_STATUSES, WORKSHOP_SERVICES } from './vehicle-task';

const workshopServiceSchema = z.enum(WORKSHOP_SERVICES);
const paymentMethodSchema = z.enum(['cash', 'card', 'upi', 'other']);

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

export const indianMobileSchema = z
  .string()
  .min(1, 'Contact number is required')
  .refine(isValidIndianMobile, 'Enter a valid 10-digit Indian mobile number');

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export const vehicleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(2, 'Plate number is required'),
  color: z.string().optional(),
  vin: z.string().max(17).optional(),
});

const vehicleTaskPaymentFieldsSchema = z.object({
  paymentMethod: paymentMethodSchema,
  amount: z.coerce.number().min(0, 'Enter a valid total amount'),
  advancePayment: z.coerce.number().min(0, 'Enter a valid advance amount').default(0),
});

const withAdvanceNotExceedingTotal = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine((data: { amount: number; advancePayment: number }) => data.advancePayment <= data.amount, {
    message: 'Advance payment cannot exceed total amount',
    path: ['advancePayment'],
  });

export const vehicleTaskSchema = withAdvanceNotExceedingTotal(
  z.object({
    vehicleBrand: z.string().min(1, 'Vehicle brand is required'),
    vehicleModel: z.string().min(1, 'Vehicle model is required'),
    vehicleNumber: z.string().min(2, 'Vehicle number is required'),
    customerId: z.string().min(1, 'Customer is required'),
    services: z.array(workshopServiceSchema).min(1, 'Select at least one service'),
    paymentMethod: paymentMethodSchema,
    amount: z.coerce.number().min(0, 'Enter a valid total amount'),
    advancePayment: z.coerce.number().min(0, 'Enter a valid advance amount').default(0),
    assignedMechanicId: z.string().optional(),
    estimatedCompletion: z.string().optional(),
  }),
);

export const vehicleTaskCreateFormSchema = withAdvanceNotExceedingTotal(
  z.object({
    vehicleBrand: z.string().min(1, 'Vehicle brand is required'),
    vehicleModel: z.string().min(1, 'Vehicle model is required'),
    vehicleNumber: z.string().min(2, 'Vehicle number is required'),
    customerPhone: indianMobileSchema,
    customerName: z.string().min(2, 'Name must be at least 2 characters'),
    services: z.array(workshopServiceSchema).min(1, 'Select at least one service'),
    paymentMethod: paymentMethodSchema,
    amount: z.coerce.number().min(0, 'Enter a valid total amount'),
    advancePayment: z.coerce.number().min(0, 'Enter a valid advance amount').default(0),
  }),
);

export const vehicleTaskUpdateSchema = withAdvanceNotExceedingTotal(
  z.object({
    vehicleBrand: z.string().min(1, 'Vehicle brand is required'),
    vehicleModel: z.string().min(1, 'Vehicle model is required'),
    vehicleNumber: z.string().min(2, 'Vehicle number is required'),
    customerId: z.string().min(1, 'Customer is required'),
    services: z.array(workshopServiceSchema).min(1, 'Select at least one service'),
    paymentMethod: paymentMethodSchema,
    amount: z.coerce.number().min(0, 'Enter a valid total amount'),
    advancePayment: z.coerce.number().min(0, 'Enter a valid advance amount').default(0),
  }),
);

export const vehicleTaskPaymentUpdateSchema = withAdvanceNotExceedingTotal(
  vehicleTaskPaymentFieldsSchema.extend({
    taskId: z.string().min(1),
  }),
);

export const vehicleTaskTransitionSchema = z.object({
  taskId: z.string().min(1),
  toStatus: z.enum(VEHICLE_TASK_STATUSES),
});

export const inventoryItemSchema = z.object({
  sku: z.string().min(2, 'SKU is required'),
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(2, 'Category is required'),
  quantity: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().int().min(0),
});

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Phone is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  status: z.enum(['active', 'inactive']),
  hireDate: z.string().min(1, 'Hire date is required'),
});

export const mechanicSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  specializations: z.string().min(1, 'At least one specialization'),
  isAvailable: z.boolean(),
});

export const posOrderItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const posOrderSchema = z.object({
  customerId: z.string().optional(),
  vehicleTaskId: z.string().optional(),
  items: z.array(posOrderItemSchema).min(1, 'Add at least one line item'),
  tax: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'other']).optional(),
});

export const payrollEntrySchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  grossPay: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type BootstrapOrgInput = z.infer<typeof bootstrapOrgSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleTaskInput = z.infer<typeof vehicleTaskSchema>;
export type VehicleTaskCreateFormInput = z.infer<typeof vehicleTaskCreateFormSchema>;
export type VehicleTaskUpdateInput = z.infer<typeof vehicleTaskUpdateSchema>;
export type VehicleTaskPaymentUpdateInput = z.infer<typeof vehicleTaskPaymentUpdateSchema>;
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type MechanicInput = z.infer<typeof mechanicSchema>;
export type PosOrderInput = z.infer<typeof posOrderSchema>;
export type PayrollEntryInput = z.infer<typeof payrollEntrySchema>;
