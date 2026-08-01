import {
  AddMechanicLedgerEntryUseCase,
  ApproveSalaryRecordUseCase,
  BootstrapDefaultOrgUseCase,
  ChangeTaskStatusUseCase,
  CreateCategoryUseCase,
  CreateCustomerUseCase,
  CreateLeaveRequestUseCase,
  CreateMechanicUseCase,
  CreatePOSSaleUseCase,
  CreateProductUseCase,
  CreateSalaryRecordUseCase,
  CreateSupplierUseCase,
  CreateVehicleTaskUseCase,
  GetEmployeesUseCase,
  GetStoreSettingsUseCase,
  RecordStockMovementUseCase,
  RecordTaskPaymentUseCase,
  ReviewLeaveRequestUseCase,
  SearchCustomersUseCase,
  SignInUseCase,
  SignUpUseCase,
  UpdateStoreSettingsUseCase,
} from '@car-spa/application';
import { FirebaseAuthRepository } from './repositories/auth.repository';
import { FirestoreOrganizationRepository } from './repositories/organization.repository';
import { FirestoreMembershipRepository } from './repositories/membership.repository';
import { FirestoreUserRepository } from './repositories/user.repository';
import { FirestoreAuditRepository } from './repositories/audit.repository';
import { FirebaseClaimsService } from './services/claims.service';
import { FirestoreCustomerRepository } from './repositories/customer.repository';
import { FirestoreVehicleRepository } from './repositories/vehicle.repository';
import { FirestoreServiceRepository } from './repositories/service.repository';
import { FirestoreVehicleTaskRepository } from './repositories/vehicle-task.repository';
import { FirestoreTaskStatusEventRepository } from './repositories/task-status-event.repository';
import { FirestoreCategoryRepository } from './repositories/category.repository';
import { FirestoreProductRepository } from './repositories/product.repository';
import { FirestoreStockMovementRepository } from './repositories/stock-movement.repository';
import { FirestoreSupplierRepository } from './repositories/supplier.repository';
import { FirestorePOSSaleRepository } from './repositories/pos-sale.repository';
import { FirestoreMechanicRepository } from './repositories/mechanic.repository';
import { FirestoreMechanicLedgerRepository } from './repositories/mechanic-ledger.repository';
import { FirestoreLeaveRequestRepository } from './repositories/leave-request.repository';
import { FirestoreSalaryRecordRepository } from './repositories/salary-record.repository';
import { FirestoreStoreSettingsRepository } from './repositories/settings.repository';
import { FirestoreNotificationRepository } from './repositories/notification.repository';
import { FirestoreDraftRepository } from './repositories/draft.repository';
import { FirestoreSerializedItemRepository } from './repositories/serialized-item.repository';

const authRepository = new FirebaseAuthRepository();
const organizationRepository = new FirestoreOrganizationRepository();
const membershipRepository = new FirestoreMembershipRepository();
const userRepository = new FirestoreUserRepository();
const auditRepository = new FirestoreAuditRepository();
const claimsService = new FirebaseClaimsService();

const customerRepository = new FirestoreCustomerRepository();
const vehicleRepository = new FirestoreVehicleRepository();
const serviceRepository = new FirestoreServiceRepository();
const vehicleTaskRepository = new FirestoreVehicleTaskRepository();
const taskStatusEventRepository = new FirestoreTaskStatusEventRepository();
const categoryRepository = new FirestoreCategoryRepository();
const productRepository = new FirestoreProductRepository();
const stockMovementRepository = new FirestoreStockMovementRepository();
const supplierRepository = new FirestoreSupplierRepository();
const posSaleRepository = new FirestorePOSSaleRepository();
const mechanicRepository = new FirestoreMechanicRepository();
const mechanicLedgerRepository = new FirestoreMechanicLedgerRepository();
const leaveRequestRepository = new FirestoreLeaveRequestRepository();
const salaryRecordRepository = new FirestoreSalaryRecordRepository();
const storeSettingsRepository = new FirestoreStoreSettingsRepository();
const notificationRepository = new FirestoreNotificationRepository();
const draftRepository = new FirestoreDraftRepository();
const serializedItemRepository = new FirestoreSerializedItemRepository();

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

export const createCustomerUseCase = new CreateCustomerUseCase(customerRepository, auditRepository);
export const searchCustomersUseCase = new SearchCustomersUseCase(customerRepository);
export const createVehicleTaskUseCase = new CreateVehicleTaskUseCase(
  vehicleTaskRepository,
  customerRepository,
  vehicleRepository,
  taskStatusEventRepository,
  auditRepository,
  draftRepository,
);
export const changeTaskStatusUseCase = new ChangeTaskStatusUseCase(
  vehicleTaskRepository,
  taskStatusEventRepository,
  auditRepository,
);
export const recordTaskPaymentUseCase = new RecordTaskPaymentUseCase(
  vehicleTaskRepository,
  auditRepository,
);
export const createCategoryUseCase = new CreateCategoryUseCase(
  categoryRepository,
  auditRepository,
);
export const createProductUseCase = new CreateProductUseCase(
  productRepository,
  categoryRepository,
  stockMovementRepository,
  auditRepository,
);
export const recordStockMovementUseCase = new RecordStockMovementUseCase(
  productRepository,
  stockMovementRepository,
  auditRepository,
);
export const createSupplierUseCase = new CreateSupplierUseCase(
  supplierRepository,
  auditRepository,
);
export const createPOSSaleUseCase = new CreatePOSSaleUseCase(
  posSaleRepository,
  productRepository as never,
  customerRepository,
  stockMovementRepository,
  auditRepository,
);
export const createMechanicUseCase = new CreateMechanicUseCase(mechanicRepository, auditRepository);
export const addMechanicLedgerEntryUseCase = new AddMechanicLedgerEntryUseCase(
  mechanicRepository,
  mechanicLedgerRepository,
  auditRepository,
);
export const createLeaveRequestUseCase = new CreateLeaveRequestUseCase(leaveRequestRepository, auditRepository);
export const reviewLeaveRequestUseCase = new ReviewLeaveRequestUseCase(leaveRequestRepository, auditRepository);
export const createSalaryRecordUseCase = new CreateSalaryRecordUseCase(
  salaryRecordRepository,
  leaveRequestRepository,
  auditRepository,
);
export const approveSalaryRecordUseCase = new ApproveSalaryRecordUseCase(salaryRecordRepository, auditRepository);
export const getStoreSettingsUseCase = new GetStoreSettingsUseCase(storeSettingsRepository);
export const updateStoreSettingsUseCase = new UpdateStoreSettingsUseCase(storeSettingsRepository, auditRepository);
export const getEmployeesUseCase = new GetEmployeesUseCase(userRepository);

export {
  authRepository,
  organizationRepository,
  membershipRepository,
  userRepository,
  auditRepository,
  claimsService,
  customerRepository,
  vehicleRepository,
  serviceRepository,
  vehicleTaskRepository,
  taskStatusEventRepository,
  categoryRepository,
  productRepository,
  stockMovementRepository,
  supplierRepository,
  posSaleRepository,
  mechanicRepository,
  mechanicLedgerRepository,
  leaveRequestRepository,
  salaryRecordRepository,
  storeSettingsRepository,
  notificationRepository,
  draftRepository,
  serializedItemRepository,
};

export * from './firebase/client';
export * from './firebase/config';
