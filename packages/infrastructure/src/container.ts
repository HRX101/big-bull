import {
  ApprovePayrollEntryUseCase,
  BootstrapDefaultOrgUseCase,
  CreateCustomerUseCase,
  CreateEmployeeUseCase,
  CreateInventoryCategoryUseCase,
  CreateInventoryItemUseCase,
  DeleteInventoryCategoryUseCase,
  DeleteInventoryItemUseCase,
  DeleteMechanicUseCase,
  CreateMechanicUseCase,
  CreateMechanicSalesRecordUseCase,
  CreatePayrollEntryUseCase,
  CreatePosOrderUseCase,
  CreateVehicleTaskUseCase,
  CreateVehicleUseCase,
  DeleteCustomerUseCase,
  DeleteVehicleTaskUseCase,
  GetWorkshopAnalyticsUseCase,
  ListAuditLogsUseCase,
  ListCustomersUseCase,
  ListEmployeesUseCase,
  ListInventoryCategoriesUseCase,
  ListInventoryUseCase,
  ListMechanicsUseCase,
  ListMechanicSalesRecordsUseCase,
  ListNotificationsUseCase,
  ListPayrollEntriesUseCase,
  ListPosOrdersUseCase,
  ListVehicleTasksUseCase,
  ListVehiclesUseCase,
  MarkNotificationReadUseCase,
  PayPosOrderUseCase,
  SignInUseCase,
  SignUpUseCase,
  TransitionVehicleTaskUseCase,
  UpdateCustomerUseCase,
  UpdateInventoryCategoryUseCase,
  UpdateInventoryItemUseCase,
  UpdateMechanicUseCase,
  UpdateVehicleTaskPaymentUseCase,
  UpdateVehicleTaskUseCase,
} from '@car-spa/application';
import { FirebaseAuthRepository } from './repositories/auth.repository';
import { FirestoreOrganizationRepository } from './repositories/organization.repository';
import { FirestoreMembershipRepository } from './repositories/membership.repository';
import { FirestoreUserRepository } from './repositories/user.repository';
import { FirestoreAuditRepository } from './repositories/audit.repository';
import {
  FirestoreAnalyticsRepository,
  FirestoreCustomerRepository,
  FirestoreEmployeeRepository,
  FirestoreInventoryCategoryRepository,
  FirestoreInventoryRepository,
  FirestoreMechanicRepository,
  FirestoreMechanicSalesRecordRepository,
  FirestoreNotificationRepository,
  FirestorePayrollRepository,
  FirestorePosOrderRepository,
  FirestoreVehicleRepository,
  FirestoreVehicleTaskRepository,
} from './repositories/operations.repository';
import { FirebaseClaimsService } from './services/claims.service';
import { ClientReceiptService } from './services/receipt.service';
import { CallableWhatsAppMessagingService } from './services/whatsapp.service';

const membershipRepository = new FirestoreMembershipRepository();
const userRepository = new FirestoreUserRepository();
const auditRepository = new FirestoreAuditRepository();
const claimsService = new FirebaseClaimsService();
const authRepository = new FirebaseAuthRepository(membershipRepository, userRepository);
const organizationRepository = new FirestoreOrganizationRepository();

const customerRepository = new FirestoreCustomerRepository();
const vehicleRepository = new FirestoreVehicleRepository();
const vehicleTaskRepository = new FirestoreVehicleTaskRepository();
const inventoryCategoryRepository = new FirestoreInventoryCategoryRepository();
const inventoryRepository = new FirestoreInventoryRepository();
const employeeRepository = new FirestoreEmployeeRepository();
const mechanicRepository = new FirestoreMechanicRepository();
const mechanicSalesRecordRepository = new FirestoreMechanicSalesRecordRepository();
const posOrderRepository = new FirestorePosOrderRepository();
const payrollRepository = new FirestorePayrollRepository();
const notificationRepository = new FirestoreNotificationRepository();
const analyticsRepository = new FirestoreAnalyticsRepository(
  customerRepository,
  vehicleRepository,
  vehicleTaskRepository,
  inventoryRepository,
  employeeRepository,
  mechanicRepository,
  posOrderRepository,
  payrollRepository,
);
const receiptService = new ClientReceiptService(posOrderRepository);
const whatsAppMessagingService = new CallableWhatsAppMessagingService();

export const signInUseCase = new SignInUseCase(authRepository);
export const signUpUseCase = new SignUpUseCase(authRepository);
export const bootstrapDefaultOrgUseCase = new BootstrapDefaultOrgUseCase(
  authRepository,
  organizationRepository,
  membershipRepository,
  userRepository,
  claimsService,
  auditRepository,
);

export const listCustomersUseCase = new ListCustomersUseCase(authRepository, customerRepository);
export const createCustomerUseCase = new CreateCustomerUseCase(
  authRepository,
  customerRepository,
  auditRepository,
);
export const updateCustomerUseCase = new UpdateCustomerUseCase(
  authRepository,
  customerRepository,
  auditRepository,
);
export const deleteCustomerUseCase = new DeleteCustomerUseCase(
  authRepository,
  customerRepository,
  auditRepository,
);

export const listVehiclesUseCase = new ListVehiclesUseCase(authRepository, vehicleRepository);
export const createVehicleUseCase = new CreateVehicleUseCase(
  authRepository,
  vehicleRepository,
  auditRepository,
);

export const listVehicleTasksUseCase = new ListVehicleTasksUseCase(
  authRepository,
  vehicleTaskRepository,
);
export const createVehicleTaskUseCase = new CreateVehicleTaskUseCase(
  authRepository,
  vehicleTaskRepository,
  auditRepository,
  notificationRepository,
);
export const updateVehicleTaskUseCase = new UpdateVehicleTaskUseCase(
  authRepository,
  vehicleTaskRepository,
  auditRepository,
);
export const updateVehicleTaskPaymentUseCase = new UpdateVehicleTaskPaymentUseCase(
  authRepository,
  vehicleTaskRepository,
  auditRepository,
);
export const deleteVehicleTaskUseCase = new DeleteVehicleTaskUseCase(
  authRepository,
  vehicleTaskRepository,
  auditRepository,
);
export const transitionVehicleTaskUseCase = new TransitionVehicleTaskUseCase(
  authRepository,
  vehicleTaskRepository,
  customerRepository,
  auditRepository,
  whatsAppMessagingService,
);

export const listInventoryCategoriesUseCase = new ListInventoryCategoriesUseCase(
  authRepository,
  inventoryCategoryRepository,
);
export const createInventoryCategoryUseCase = new CreateInventoryCategoryUseCase(
  authRepository,
  inventoryCategoryRepository,
  auditRepository,
);
export const updateInventoryCategoryUseCase = new UpdateInventoryCategoryUseCase(
  authRepository,
  inventoryCategoryRepository,
  auditRepository,
);
export const deleteInventoryCategoryUseCase = new DeleteInventoryCategoryUseCase(
  authRepository,
  inventoryCategoryRepository,
  inventoryRepository,
  auditRepository,
);

export const listInventoryUseCase = new ListInventoryUseCase(authRepository, inventoryRepository);
export const createInventoryItemUseCase = new CreateInventoryItemUseCase(
  authRepository,
  inventoryRepository,
  inventoryCategoryRepository,
  auditRepository,
);
export const updateInventoryItemUseCase = new UpdateInventoryItemUseCase(
  authRepository,
  inventoryRepository,
  inventoryCategoryRepository,
  auditRepository,
);
export const deleteInventoryItemUseCase = new DeleteInventoryItemUseCase(
  authRepository,
  inventoryRepository,
  auditRepository,
);

export const listEmployeesUseCase = new ListEmployeesUseCase(authRepository, employeeRepository);
export const createEmployeeUseCase = new CreateEmployeeUseCase(
  authRepository,
  employeeRepository,
  auditRepository,
);

export const listMechanicsUseCase = new ListMechanicsUseCase(authRepository, mechanicRepository);
export const createMechanicUseCase = new CreateMechanicUseCase(
  authRepository,
  mechanicRepository,
  auditRepository,
);
export const updateMechanicUseCase = new UpdateMechanicUseCase(
  authRepository,
  mechanicRepository,
  auditRepository,
);
export const deleteMechanicUseCase = new DeleteMechanicUseCase(
  authRepository,
  mechanicRepository,
  auditRepository,
);
export const listMechanicSalesRecordsUseCase = new ListMechanicSalesRecordsUseCase(
  authRepository,
  mechanicSalesRecordRepository,
);
export const createMechanicSalesRecordUseCase = new CreateMechanicSalesRecordUseCase(
  authRepository,
  mechanicRepository,
  mechanicSalesRecordRepository,
  auditRepository,
);

export const listPosOrdersUseCase = new ListPosOrdersUseCase(authRepository, posOrderRepository);
export const createPosOrderUseCase = new CreatePosOrderUseCase(
  authRepository,
  posOrderRepository,
  inventoryRepository,
  mechanicRepository,
  customerRepository,
  auditRepository,
);
export const payPosOrderUseCase = new PayPosOrderUseCase(
  authRepository,
  posOrderRepository,
  inventoryRepository,
  auditRepository,
);

export const listPayrollEntriesUseCase = new ListPayrollEntriesUseCase(
  authRepository,
  payrollRepository,
);
export const createPayrollEntryUseCase = new CreatePayrollEntryUseCase(
  authRepository,
  payrollRepository,
  auditRepository,
);
export const approvePayrollEntryUseCase = new ApprovePayrollEntryUseCase(
  authRepository,
  payrollRepository,
  auditRepository,
);

export const listAuditLogsUseCase = new ListAuditLogsUseCase(authRepository, auditRepository);
export const listNotificationsUseCase = new ListNotificationsUseCase(
  authRepository,
  notificationRepository,
);
export const markNotificationReadUseCase = new MarkNotificationReadUseCase(
  authRepository,
  notificationRepository,
);
export const getWorkshopAnalyticsUseCase = new GetWorkshopAnalyticsUseCase(
  authRepository,
  analyticsRepository,
);

export {
  authRepository,
  organizationRepository,
  membershipRepository,
  userRepository,
  auditRepository,
  claimsService,
  customerRepository,
  vehicleRepository,
  vehicleTaskRepository,
  inventoryCategoryRepository,
  inventoryRepository,
  employeeRepository,
  mechanicRepository,
  posOrderRepository,
  payrollRepository,
  notificationRepository,
  analyticsRepository,
  receiptService,
};

export * from './firebase/client';
export * from './firebase/config';
export { getAppOrigin, getAuthActionUrl } from './firebase/app-url';
