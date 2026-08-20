# Big Bull Car Spa ERP — Complete Codebase Documentation

Enterprise-grade multi-tenant SaaS ERP for automotive (car/bike) service centers.
Built with **Next.js 15 + Firebase** following **Clean Architecture**.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture](#2-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Packages](#4-packages)
5. [Feature Modules](#5-feature-modules)
6. [Firestore Schema](#6-firestore-schema)
7. [Security & RBAC](#7-security--rbac)
8. [WhatsApp Notifications](#8-whatsapp-notifications)
9. [Cloud Functions](#9-cloud-functions)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Environment Variables](#12-environment-variables)
13. [Development Guide](#13-development-guide)
14. [Key Patterns & Conventions](#14-key-patterns--conventions)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, Turbopack), React 19, TypeScript 5.8 |
| Styling | Tailwind CSS v4, shadcn/ui (Radix primitives) |
| State | TanStack Query v5 (server), Zustand v5 (client) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Auth | Firebase Auth (Email/Password, Google) |
| Database | Firestore (NoSQL) |
| Functions | Firebase Cloud Functions v2 |
| Storage | Firebase Storage |
| Testing | Vitest (unit), Playwright (E2E), Firebase Emulator Suite |
| Tooling | Prettier, ESLint, Docker |
| CI/CD | GitHub Actions |

---

## 2. Architecture

### Clean Architecture (Onion Architecture)

```
Presentation → Application → Domain ← Infrastructure → Firebase
```

| Layer | Responsibility | Location |
|---|---|---|
| Presentation | UI, pages, hooks, providers | `apps/web/src/` |
| Application | Use cases, port interfaces, orchestration | `packages/application/` |
| Domain | Entities, Zod schemas, business rules | `packages/domain/` |
| Infrastructure | Firebase adapters, repositories, DI container | `packages/infrastructure/` |
| Shared | Permissions, constants, Result type | `packages/shared/` |

**Dependency Rule:** Dependencies point inward only. Domain has zero external dependencies.

### Feature Module Structure

Each feature follows this internal layout:

```
features/<module>/
├── ui/           # React page components and dialogs
├── api/          # React Query hooks wrapping use cases
├── hooks/        # Custom React hooks
├── stores/       # Zustand stores (when needed)
├── providers/    # React context providers
├── lib/          # Feature-specific utilities
└── docs/         # Feature documentation
```

### Provider Tree

```
ThemeProvider → QueryClientProvider (staleTime: 60s) → FirebaseProvider → AuthProvider → Toaster
```

### Middleware

Next.js middleware checks for `car-spa-auth` cookie. Unauthenticated requests to protected routes are redirected to `/auth/sign-in?redirect=<original-path>`.

---

## 3. Monorepo Structure

```
big-bull/
├── apps/
│   └── web/                        # Next.js 15 application
│       ├── src/
│       │   ├── app/                # App Router pages
│       │   ├── components/         # Shared UI components
│       │   ├── features/           # 15 feature modules
│       │   ├── lib/                # Utilities
│       │   ├── middleware.ts       # Auth redirect middleware
│       │   └── providers/          # React context providers
│       ├── next.config.ts
│       └── package.json
├── packages/
│   ├── shared/                     # Permissions, constants, Result type
│   ├── domain/                     # Entities, Zod schemas, business rules
│   ├── application/                # Use cases, repository ports
│   └── infrastructure/             # Firebase adapters, repositories, DI
├── functions/                      # Firebase Cloud Functions (v2)
├── firebase/                       # Security rules, indexes
├── e2e/                            # Playwright tests
├── docs/                           # Documentation
├── scripts/                        # Utility scripts
├── firebase.json                   # Firebase project config
├── docker-compose.yml
├── Dockerfile
├── playwright.config.ts
└── tsconfig.base.json
```

**Workspaces:** `apps/*`, `packages/*`, `functions`

**Package names:** `@car-spa/web`, `@car-spa/shared`, `@car-spa/domain`, `@car-spa/application`, `@car-spa/infrastructure`, `@car-spa/functions`

---

## 4. Packages

### 4.1 `@car-spa/shared`

Cross-cutting utilities with zero business logic.

| Export | Description |
|---|---|
| `UserRole` | `'owner' \| 'employee'` |
| `Permission` | 46 fine-grained permission strings |
| `ROLE_PERMISSIONS` | Maps each role to its allowed permissions |
| `hasPermission(role, permission)` | Check if role has permission |
| `assertPermission(role, permission)` | Throw if role lacks permission |
| `Result<T, E>` | Rust-inspired discriminated union |
| `ok(value)` / `err(error)` | Create Result instances |
| `isOk(r)` / `isErr(r)` | Check Result variant |
| `unwrap(r)` | Extract value or throw |
| `COLLECTIONS` | 30 Firestore collection name constants |
| `DEFAULT_ORG_SLUG` | `'big-bull-car-spa'` |
| `AUTH_ROUTES` | Route map: signIn, signUp, forgotPassword, verifyEmail, onboarding |
| `PROTECTED_ROUTES` | All dashboard routes requiring auth |
| `PUBLIC_ROUTES` | Routes accessible without auth |
| `TASK_STATUSES` | `['RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED']` |
| `LEAVE_STATUSES` | `['PENDING', 'APPROVED', 'REJECTED']` |
| `SALARY_STATUSES` | `['PENDING', 'APPROVED', 'PAID']` |
| `PAYMENT_MODES` | `['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']` |
| `STOCK_MOVEMENT_TYPES` | `['RESTOCK_IN', 'MANUAL_OUT', 'POS_SALE', 'VEHICLE_TASK_USE']` |
| `UNITS` | `['piece', 'litre', 'kg', 'box', 'pack', 'set', 'pair', 'metre']` |

### 4.2 `@car-spa/domain`

Pure business logic. Zero external dependencies (only `@car-spa/shared` and `zod`).

**27 Entity Interfaces:**

| Category | Entities |
|---|---|
| Auth & Org | `Organization`, `Membership`, `UserProfile`, `AuditLogEntry` |
| Customers & Vehicles | `Customer`, `Vehicle`, `Service` |
| Job Management | `VehicleTask`, `TaskStatusEvent`, `TaskDraft` |
| Inventory | `Category`, `Product`, `StockMovement`, `SerializedItem`, `AttributeDefinition` |
| Suppliers | `Supplier`, `SupplierPurchaseEntry` |
| POS | `POSSale`, `POSSaleItem` |
| Workforce | `Mechanic`, `MechanicLedgerEntry`, `LeaveRequest`, `SalaryRecord` |
| Config | `StoreSettings` |
| Notifications | `NotificationLog`, `StatusChangeNotificationTemplate` |

**20 Zod Validation Schemas:**

`signInSchema`, `signUpSchema`, `forgotPasswordSchema`, `bootstrapOrgSchema`, `phoneSchema`, `indianVehiclePlateSchema`, `customerSchema`, `vehicleSchema`, `vehicleTaskCreateSchema`, `taskStatusChangeSchema`, `recordPaymentSchema`, `attributeDefinitionSchema`, `categorySchema`, `productSchema`, `stockMovementSchema`, `supplierSchema`, `supplierPurchaseEntrySchema`, `posSaleSchema`, `mechanicSchema`, `mechanicLedgerEntrySchema`, `leaveRequestSchema`, `salaryRecordSchema`, `storeSettingsSchema`, `changePasswordSchema`

**Business Logic Files:**

| File | Description |
|---|---|
| `auth.ts` | `AuthSession` interface, `isAuthenticated()`, `hasOrgContext()`, `requiresOnboarding()` |
| `phone.ts` | `normalizeIndianMobile()`, `formatIndianMobileE164()`, `isValidIndianMobile()` |
| `vehicle-task.ts` | State machine (`todo` → `in_progress` → `ready_for_pickup`), task code generator (`VT-YYYY-NNNN`), workshop services, payment status helpers, WhatsApp message builder |
| `entities/notification-template.entity.ts` | Template placeholders, default template, `renderTemplate()` |
| `schemas/notification-template.schema.ts` | Template validation, token extraction |

**Vehicle Task State Machine:**

```
todo ──────────→ in_progress ──────────→ ready_for_pickup
                   ↑                          │
                   └──────────────────────────┘
```

- `todo` → `in_progress`
- `in_progress` → `todo` (reopen) or `ready_for_pickup`
- `ready_for_pickup` → `in_progress` (reopen)

### 4.3 `@car-spa/application`

Use cases and port interfaces. Depends on `@car-spa/domain` and `@car-spa/shared`.

**25 Repository Port Interfaces (Hexagonal Architecture):**

| Port | Methods |
|---|---|
| `AuthRepository` | signIn, signUp, signInWithGoogle, signOut, sendPasswordReset, sendEmailVerification, getCurrentSession, refreshSession |
| `OrganizationRepository` | findById, findBySlug, create |
| `MembershipRepository` | findByUserId, findByOrgId, create, update, delete |
| `UserRepository` | findById, findByOrgId, upsert, update, delete |
| `ClaimsService` | syncClaims(userId, orgId, role) |
| `AuditRepository` | log, findByOrgId |
| `CustomerRepository` | findById, findByPhone, findByOrgId, search, create, update |
| `VehicleRepository` | findById, findByCustomerId, findByOrgId, findByNumber, create, update |
| `ServiceRepository` | findById, findByOrgId, create, update, delete |
| `VehicleTaskRepository` | findById, findByOrgId, create, createWithEvent, update, getCountByStatus |
| `TaskStatusEventRepository` | findByTaskId, create, updateWhatsAppStatus |
| `CategoryRepository` | findById, findByOrgId, findByCodePrefix, getNextSequence, create, update, delete |
| `ProductRepository` | findById, findByIds, findByCategoryId, findByOrgId, search, findBySku, create, createWithSequence, update, delete, deleteMany, updateCurrentStock, getLowStock, getStockValue, getTopSelling, getSlowMoving, bulkCreate |
| `StockMovementRepository` | findByProductId, findByOrgId, findBySupplierId, create, getDerivedStock |
| `SupplierRepository` | findById, findByOrgId, findByPhone, create, update, delete, updateAmounts |
| `SupplierPurchaseRepository` | findBySupplierId, findByOrgId, create |
| `POSSaleRepository` | findById, findByOrgId, create, createSaleBatch, getDailyTotal, getMonthlyTotal |
| `MechanicRepository` | findById, findByOrgId, create, update, delete, updateBalance |
| `MechanicLedgerRepository` | findByMechanicId, findByOrgId, create |
| `LeaveRequestRepository` | findById, findByOrgId, findByEmployeeId, create, update, getPendingCount |
| `SalaryRecordRepository` | findById, findByOrgId, findByEmployeeId, create, update, getPendingCount |
| `StoreSettingsRepository` | findByOrgId, upsert |
| `NotificationRepository` | findById, findByReference, create, update, getFailedNotifications |
| `DraftRepository` | findByUserAndType, upsert, delete |
| `SerializedItemRepository` | findByProductId, findByOrgId, findAvailableByProductId, create, bulkCreate, createSerializedRestock, update, delete, deleteMany, bulkSetUnavailable |

**Additional Ports:**

| Port | Methods |
|---|---|
| `IWhatsAppProvider` | send(payload) → Result |
| `WhatsAppLogRepository` | create(entry) |
| `WhatsAppDedupeRepository` | acquire(key) → boolean |
| `NotificationTemplateRepository` | findByOrgId, upsert |

**25 Use Cases:**

| Use Case | Input | Output | Permission |
|---|---|---|---|
| `SignInUseCase` | `{ email, password }` | `Result<AuthSession>` | — |
| `SignUpUseCase` | `{ email, password, displayName }` | `Result<AuthSession>` | — |
| `BootstrapDefaultOrgUseCase` | `{ orgName }` | `Result<AuthSession>` | — |
| `CreateCustomerUseCase` | `{ name, phone, email?, address? }` | `Result<Customer>` | `customer:create` |
| `SearchCustomersUseCase` | `query: string` | `Customer[]` | `customer:read` |
| `CreateVehicleTaskUseCase` | `{ customerId, vehicleId, serviceIds, paymentMode, totalAmount, paidAmount, notes? }` | `Result<VehicleTask>` | `vehicleTask:create` |
| `ChangeTaskStatusUseCase` | `{ taskId, toStatus, note }` | `Result<TaskStatusEvent>` | `vehicleTask:update` |
| `RecordTaskPaymentUseCase` | `{ taskId, amount }` | `Result<VehicleTask>` | `vehicleTask:update` |
| `CreateCategoryUseCase` | `{ name, codePrefix, attributeSchema, ... }` | `Result<{ id }>` | `inventory:create` |
| `CreateProductUseCase` | `{ categoryId, name, costPrice, sellingPrice, unit, ... }` | `Result<Product>` | `inventory:create` |
| `RecordStockMovementUseCase` | `{ productId, type, quantity, note, ... }` | `Result<StockMovement>` | `inventory:create` |
| `AutoDeductStockUseCase` | `productId, quantity, type, referenceId, orgId, actorId` | `Result<StockMovement>` | — (internal) |
| `CreateSupplierUseCase` | `{ name, contactPhone?, notes?, toBePaid, advanceAmount }` | `Result<Supplier>` | `supplier:create` |
| `AddSupplierPurchaseEntryUseCase` | `{ supplierId, type, amount, description }` | `Result<SupplierPurchaseEntry>` | `supplier:create` |
| `CreatePOSSaleUseCase` | `{ customerId?, items, paymentMode }` | `Result<POSSale>` | `pos:create` |
| `CreateMechanicUseCase` | `{ name, storeName, phone?, address? }` | `Result<Mechanic>` | `mechanic:create` |
| `AddMechanicLedgerEntryUseCase` | `{ mechanicId, type, amount, description, items? }` | `Result<MechanicLedgerEntry>` | `mechanic:create` |
| `CreateLeaveRequestUseCase` | `{ fromDate, toDate, reason?, leaveType }` | `Result<LeaveRequest>` | `leave:create` |
| `ReviewLeaveRequestUseCase` | `leaveId, status, orgId, reviewerId` | `Result<LeaveRequest>` | `leave:approve` |
| `GetEmployeesUseCase` | `orgId` | `UserProfile[]` | `employee:read` |
| `CreateSalaryRecordUseCase` | `{ employeeId, month, year, fullSalary, workingDays, leaveDays, ... }` | `Result<SalaryRecord>` | `salary:create` |
| `ApproveSalaryRecordUseCase` | `salaryId, status, orgId, actorId` | `Result<SalaryRecord>` | `salary:approve` |
| `GetStoreSettingsUseCase` | `orgId` | `StoreSettings \| null` | `settings:read` |
| `UpdateStoreSettingsUseCase` | `{ storeName, address?, taxRate, ... }` | `Result<StoreSettings>` | `settings:update` |
| `GetNotificationTemplateUseCase` | `storeId` | `StatusChangeNotificationTemplate \| null` | `settings:read` |
| `UpdateNotificationTemplateUseCase` | `{ storeId, messageTemplate }` | `Result<StatusChangeNotificationTemplate>` | `settings:update` |
| `NotifyStatusChangeUseCase` | `{ storeId, taskId }` | `Result<StatusChangeNotificationResult>` | — (internal) |

**OrgContext (RBAC enforcement):**

Every use case that touches tenant data receives `orgId` and `actorId`. The application layer uses `requireOrgContext(session)` to extract these and `requirePermission(ctx, permission)` to enforce RBAC before executing business logic.

**Salary Calculation:**

```typescript
perDayRate = fullSalary / workingDays
deduction = leaveDays * perDayRate
payableAmount = fullSalary - deduction
```

### 4.4 `@car-spa/infrastructure`

Firebase adapters implementing the port interfaces. Contains the DI container.

**28 Firestore Repositories:**

Each repository implements one port interface using Firestore SDK.

| Repository | Port Implemented |
|---|---|
| `FirebaseAuthRepository` | `AuthRepository` |
| `FirestoreOrganizationRepository` | `OrganizationRepository` |
| `FirestoreMembershipRepository` | `MembershipRepository` |
| `FirestoreUserRepository` | `UserRepository` |
| `FirestoreAuditRepository` | `AuditRepository` |
| `FirestoreCustomerRepository` | `CustomerRepository` |
| `FirestoreVehicleRepository` | `VehicleRepository` |
| `FirestoreServiceRepository` | `ServiceRepository` |
| `FirestoreVehicleTaskRepository` | `VehicleTaskRepository` |
| `FirestoreTaskStatusEventRepository` | `TaskStatusEventRepository` |
| `FirestoreCategoryRepository` | `CategoryRepository` |
| `FirestoreProductRepository` | `ProductRepository` |
| `FirestoreStockMovementRepository` | `StockMovementRepository` |
| `FirestoreSupplierRepository` | `SupplierRepository` |
| `FirestoreSupplierPurchaseRepository` | `SupplierPurchaseRepository` |
| `FirestorePOSSaleRepository` | `POSSaleRepository` |
| `FirestoreMechanicRepository` | `MechanicRepository` |
| `FirestoreMechanicLedgerRepository` | `MechanicLedgerRepository` |
| `FirestoreLeaveRequestRepository` | `LeaveRequestRepository` |
| `FirestoreSalaryRecordRepository` | `SalaryRecordRepository` |
| `FirestoreStoreSettingsRepository` | `StoreSettingsRepository` |
| `FirestoreNotificationRepository` | `NotificationRepository` |
| `FirestoreDraftRepository` | `DraftRepository` |
| `FirestoreSerializedItemRepository` | `SerializedItemRepository` |
| `FirestoreWhatsAppLogRepository` | `WhatsAppLogRepository` |
| `FirestoreWhatsAppDedupeRepository` | `WhatsAppDedupeRepository` |
| `FirestoreNotificationTemplateRepository` | `NotificationTemplateRepository` |

**WhatsApp Provider Factory:**

```
WHATSAPP_PROVIDER=meta   → MetaWhatsAppAdapter
WHATSAPP_PROVIDER=twilio → TwilioWhatsAppAdapter
WHATSAPP_PROVIDER=none   → NoopWhatsAppAdapter
```

**DI Container (`container.ts`):**

Manual dependency injection. All repositories, services, and use cases are instantiated as singletons at module load time and exported as named instances. No DI framework.

---

## 5. Feature Modules

### 5.1 Authentication

**Files:** `providers/auth-provider.tsx`, `stores/auth-store.ts`, `hooks/use-auth.ts`, `hooks/use-auth-mutations.ts`, `ui/auth-guard.tsx`, `ui/sign-in-form.tsx`, `ui/sign-up-form.tsx`, `ui/forgot-password-form.tsx`, `ui/onboarding-form.tsx`, `ui/onboarding-guard.tsx`

**Flow:**
1. User signs up → email verification sent
2. User verifies email → redirected to onboarding
3. Onboarding creates default org + membership + user profile
4. `syncUserClaims` Cloud Function sets custom claims (`orgId`, `role`)
5. Client refreshes token → enters dashboard

**Providers:** Email/Password, Google Sign-In

### 5.2 Dashboard

**Files:** `ui/dashboard-home.tsx`, `ui/sidebar.tsx`, `ui/top-bar.tsx`, `ui/profile-menu.tsx`, `ui/theme-toggle.tsx`, `ui/quick-actions.tsx`, `ui/due-overview.tsx`, `ui/employee-dashboard.tsx`, `stores/use-sidebar-store.ts`

**Features:**
- Today's stats (tasks, revenue)
- Task status chart (Recharts)
- "To Be Paid" (supplier dues) and "To Get" (mechanic receivables) cards
- Quick action buttons
- Employee-specific dashboard view
- Sidebar with module navigation
- Dark/light theme toggle

### 5.3 Customers

**Files:** `api/use-customers.ts`, `ui/customers-page.tsx`, `ui/customer-dialog.tsx`

**Features:**
- Unified customer list with search
- Dedup by phone number (returns existing customer if phone matches)
- Spend and visit history tracking
- `totalSpend` and `visitCount` updated on task creation

**Use Cases:** `CreateCustomerUseCase`, `SearchCustomersUseCase`

### 5.4 Vehicle Tasks

**Files:** `api/use-vehicle-tasks.ts`, `ui/vehicle-tasks-page.tsx`, `ui/task-wizard-dialog.tsx`, `ui/task-detail-panel.tsx`, `ui/status-change-dialog.tsx`

**Features:**
- Kanban board (To Do / In Progress / Ready to Pickup)
- Multi-step task creation wizard (customer → vehicle → services → payment)
- Status change with mandatory notes
- Payment recording (partial/full)
- Auto-generated task codes: `VT-YYYY-NNNN`
- Draft saving for incomplete task creation
- WhatsApp notifications on status changes

**Use Cases:** `CreateVehicleTaskUseCase`, `ChangeTaskStatusUseCase`, `RecordTaskPaymentUseCase`

**State Machine:** `todo` → `in_progress` → `ready_for_pickup` (with back-transitions)

**Workshop Services:** Car exterior wash, Interior wash, Bike wash, Polish, Tyre change

### 5.5 Inventory

**Files:** `api/use-inventory.ts`, `ui/inventory-page.tsx`, `ui/import-products-dialog.tsx`, `lib/import-products.ts`

**Features:**
- Category hierarchy with flexible attribute schemas (text/number/select)
- Auto-SKU generation: `{CODE_PREFIX}-{SEQUENCE}` (e.g., `OIL-0001`)
- Append-only stock movement ledger (stock is derived, never written directly)
- Movement types: `RESTOCK_IN`, `MANUAL_OUT`, `POS_SALE`, `VEHICLE_TASK_USE`
- Low-stock alerts
- Bulk product import from Excel
- Product search by name/SKU/category
- Serialized item tracking

**Use Cases:** `CreateCategoryUseCase`, `CreateProductUseCase`, `RecordStockMovementUseCase`, `AutoDeductStockUseCase`

**4-Entity Domain Model:**
- `Category` — name, codePrefix, attributeSchema, productNames, lowStockThresholdDefault
- `Product` — sku, name, attributeValues, costPrice, sellingPrice, currentStock (derived)
- `StockMovement` — productId, type, quantity, note, referenceId, serialNumbers
- `Supplier` — name, contactPhone, totalAmount, advanceAmount, toBePaid

### 5.6 Suppliers

**Files:** `ui/suppliers-page.tsx`

**Features:**
- Supplier list with balance tracking
- Purchase and advance entry recording
- `toBePaid` balance maintained backend-side
- Purchase history ledger

**Use Cases:** `CreateSupplierUseCase`, `AddSupplierPurchaseEntryUseCase`

### 5.7 POS (Point of Sale)

**Files:** `api/use-pos.ts`, `ui/pos-page.tsx`, `ui/cart-item.tsx`, `ui/receipt-modal.tsx`, `ui/serial-select-dialog.tsx`, `ui/transactions-page.tsx`

**Features:**
- Cart-based selling
- Auto stock deduction on sale completion
- Serialized item selection (when applicable)
- Receipt generation with receipt number (`RCT-YYYYMMDD-XXXXXX`)
- Daily and monthly sales totals
- Transaction history

**Use Cases:** `CreatePOSSaleUseCase`

**Sale Flow:**
1. Add items to cart (products or service line items)
2. Select serial numbers (if product has serialized items)
3. Choose payment mode
4. Confirm sale → stock deducted, movements recorded, receipt generated

### 5.8 Employees

**Files:** `api/use-employees.ts`, `api/use-salary.ts`, `ui/employees-page.tsx`, `ui/add-employee-dialog.tsx`, `ui/leave-request-dialog.tsx`, `ui/salary-dialog.tsx`, `ui/salary-section.tsx`, `ui/payslip-modal.tsx`

**Features:**
- Employee list (users with org membership)
- Toggle active/inactive status
- Leave request creation and approval workflow
- Salary section with payslip generation
- Leave types: UNPAID, PAID, SICK

**Use Cases:** `GetEmployeesUseCase`, `CreateLeaveRequestUseCase`, `ReviewLeaveRequestUseCase`, `CreateSalaryRecordUseCase`, `ApproveSalaryRecordUseCase`

**Leave Workflow:**
1. Employee creates leave request (PENDING)
2. Owner approves or rejects (APPROVED/REJECTED)
3. UNPAID/SICK leave days deducted from salary during generation

**Salary Workflow:**
1. Owner creates salary record for employee/month
2. `perDayRate = fullSalary / workingDays`
3. `deduction = leaveDays × perDayRate`
4. `payableAmount = fullSalary - deduction`
5. Owner approves (APPROVED) then marks paid (PAID)

### 5.9 Mechanics

**Files:** `api/use-mechanics.ts`, `ui/mechanics-page.tsx`, `ui/mechanic-dialog.tsx`, `ui/ledger-entry-dialog.tsx`

**Features:**
- External mechanic management
- DEBIT/CREDIT balance ledger with item-level detail
- Balance auto-updated on ledger entry creation
- Item count tracking

**Use Cases:** `CreateMechanicUseCase`, `AddMechanicLedgerEntryUseCase`

**Ledger:**
- `DEBIT` — mechanic owes money (e.g., items supplied)
- `CREDIT` — mechanic is paid (reduces balance)
- `balance += amount` for DEBIT, `balance -= amount` for CREDIT

### 5.10 Payroll

**Files:** `ui/salary-section.tsx`, `ui/salary-dialog.tsx`, `ui/payslip-modal.tsx`

**Features:**
- Salary generation with auto-deduction based on leave days
- Per-day rate calculation
- Approve/paid workflow
- Payslip modal display

**Use Cases:** `CreateSalaryRecordUseCase`, `ApproveSalaryRecordUseCase`

### 5.11 Settings

**Files:** `ui/settings-page.tsx`, `ui/notification-template-card.tsx`

**Features:**
- Store configuration (name, address, GSTIN, tax rate, logo)
- Working days per month, default leave type
- WhatsApp provider configuration (Meta/Twilio/None)
- Notification template customization with `{{placeholder}}` syntax

**Placeholders:** `{{customerName}}`, `{{vehicleNumber}}`, `{{status}}`, `{{storeName}}`, `{{taskId}}`, `{{amountDue}}`

**Use Cases:** `GetStoreSettingsUseCase`, `UpdateStoreSettingsUseCase`, `GetNotificationTemplateUseCase`, `UpdateNotificationTemplateUseCase`

### 5.12 Analytics (Scaffold)

Placeholder for future analytics module. Will include revenue reports, service breakdown, employee performance metrics.

### 5.13 Audit Logs (Scaffold)

Placeholder for audit log UI. Data is already being written via `AuditRepository.log()` in all use cases. Will display immutable audit trail.

### 5.14 Notifications (Scaffold)

Placeholder for notification management UI. WhatsApp notification infrastructure is fully implemented.

### 5.15 Vehicles (Scaffold)

Placeholder for dedicated vehicle management. Vehicles are currently managed within the vehicle task creation flow.

---

## 6. Firestore Schema

### 6.1 Core Collections

#### `organizations`

| Field | Type | Description |
|---|---|---|
| name | string | Display name |
| slug | string | URL-safe identifier (unique) |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `memberships`

| Field | Type | Description |
|---|---|---|
| userId | string | Firebase Auth UID |
| orgId | string | Organization document ID |
| role | string | `owner` \| `employee` |
| active | boolean | Whether membership is active |
| salaryAmount | number \| null | Monthly salary (for payroll) |
| minWorkDays | number \| null | Minimum work days (for payroll) |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

**Composite index:** `userId` + `orgId`

#### `users`

| Field | Type | Description |
|---|---|---|
| email | string | User email |
| displayName | string | Display name |
| photoUrl | string \| null | Profile photo URL |
| emailVerified | boolean | Email verification status |
| orgId | string \| null | Current organization |
| role | string \| null | Current role |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `auditLogs`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| actorId | string | User who performed action |
| action | string | Action identifier (e.g., `vehicleTask.create`) |
| resourceType | string | Resource type |
| resourceId | string | Resource ID |
| metadata | map | Additional context |
| createdAt | timestamp | Immutable creation time |

**Composite index:** `orgId` + `createdAt` DESC

### 6.2 Customer & Vehicle Collections

#### `customers`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| name | string | Customer name |
| phone | string | Phone number (dedup key) |
| email | string \| null | Email address |
| address | string \| null | Address |
| totalSpend | number | Total lifetime spend |
| visitCount | number | Total visits |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `vehicles`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| customerId | string | Owner customer ID |
| brand | string | Vehicle brand |
| model | string | Vehicle model |
| vehicleNumber | string | License plate |
| type | string | `car` \| `bike` \| `truck` \| `bus` \| `other` |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `services`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| name | string | Service name |
| description | string \| null | Service description |
| price | number | Service price |
| active | boolean | Whether service is available |
| sortOrder | number | Display order |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

### 6.3 Job Management Collections

#### `vehicleTasks`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| customerId | string | Customer ID |
| vehicleId | string | Vehicle ID |
| serviceIds | string[] | Selected service IDs |
| status | string | `RECEIVED` \| `IN_PROGRESS` \| `READY_FOR_PICKUP` \| `COMPLETED` \| `CANCELLED` |
| paymentMode | string | `CASH` \| `UPI` \| `CARD` \| `NET_BANKING` \| `OTHER` |
| paymentStatus | string | `PENDING` \| `PARTIAL` \| `FULL` |
| totalAmount | number | Total amount |
| paidAmount | number | Amount paid |
| dueAmount | number | Outstanding amount |
| notes | string \| null | Task notes |
| assignedTo | string \| null | Assigned employee ID |
| receiptUrl | string \| null | Receipt PDF URL |
| createdBy | string | Creator user ID |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `taskStatusEvents`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| taskId | string | Parent task ID |
| fromStatus | string \| null | Previous status |
| toStatus | string | New status |
| note | string | Status change note (required) |
| actorId | string | User who changed status |
| whatsappStatus | string | `PENDING` \| `SENT` \| `FAILED` \| `NOT_APPLICABLE` |
| createdAt | timestamp | Creation time |

#### `drafts`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| userId | string | User who created draft |
| step | number | Current wizard step |
| data | map | Draft form data |
| updatedAt | timestamp | Last update |

### 6.4 Inventory Collections

#### `categories`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| name | string | Category name |
| codePrefix | string | SKU prefix (2-5 uppercase chars) |
| attributeSchema | array | Dynamic attribute definitions |
| productNames | string[] | Predefined product names |
| lowStockThresholdDefault | number | Default low-stock threshold |
| hasExpiry | boolean | Whether products have expiry dates |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `products`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| categoryId | string | Parent category ID |
| sku | string | Auto-generated SKU |
| name | string | Product name |
| attributeValues | map | Dynamic attribute values |
| costPrice | number | Cost price |
| sellingPrice | number | Selling price |
| unit | string | Unit of measurement |
| lowStockThreshold | number | Low-stock alert threshold |
| currentStock | number | Current stock (derived from movements) |
| expiryDate | timestamp \| null | Expiry date |
| imageUrl | string \| null | Product image URL |
| supplierId | string \| null | Default supplier ID |
| notes | string \| null | Notes |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `stockMovements`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| productId | string | Product ID |
| type | string | `RESTOCK_IN` \| `MANUAL_OUT` \| `POS_SALE` \| `VEHICLE_TASK_USE` |
| quantity | number | Quantity moved |
| note | string | Movement note |
| referenceId | string \| null | Related document ID |
| supplierId | string \| null | Supplier ID (for restocks) |
| actorId | string | User who recorded |
| serialNumbers | string[] \| null | Serial numbers (if serialized) |
| createdAt | timestamp | Creation time |

#### `serializedItems`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| productId | string | Parent product ID |
| serialNumber | string | Unique serial number |
| isAvailable | boolean | Whether item is in stock |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `sequences`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| (seqId) | number | Current sequence value per prefix |

### 6.5 Supplier Collections

#### `suppliers`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| name | string | Supplier name |
| contactPhone | string \| null | Contact phone |
| notes | string \| null | Notes |
| totalAmount | number | Total purchase amount |
| advanceAmount | number | Total advance paid |
| toBePaid | number | Outstanding balance |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `supplierPurchaseEntries`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| supplierId | string | Supplier ID |
| type | string | `PURCHASE` \| `ADVANCE` |
| amount | number | Entry amount |
| description | string | Entry description |
| referenceType | string \| null | Reference type |
| referenceId | string \| null | Reference ID |
| actorId | string | User who recorded |
| createdAt | timestamp | Creation time |

### 6.6 POS Collections

#### `posSales`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| customerId | string \| null | Customer ID |
| items | array | Embedded sale items |
| totalAmount | number | Total sale amount |
| paymentMode | string | Payment mode |
| receiptNumber | string | Unique receipt number |
| receiptUrl | string \| null | Receipt PDF URL |
| createdBy | string | Creator user ID |
| createdAt | timestamp | Creation time |

#### `posSaleItems`

| Field | Type | Description |
|---|---|---|
| saleId | string | Parent sale ID |
| itemId | string | Product ID |
| itemName | string | Product name |
| quantity | number | Quantity sold |
| unitPrice | number | Price per unit |
| totalPrice | number | Line total |
| serialNumbers | string[] \| null | Serial numbers |

### 6.7 Workforce Collections

#### `mechanics`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| name | string | Mechanic name |
| storeName | string | Shop/store name |
| phone | string \| null | Phone number |
| address | string \| null | Address |
| balance | number | Current balance (DEBIT - CREDIT) |
| active | boolean | Whether active |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `mechanicLedgerEntries`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| mechanicId | string | Mechanic ID |
| type | string | `DEBIT` \| `CREDIT` |
| amount | number | Entry amount |
| description | string | Entry description |
| referenceType | string \| null | Reference type |
| referenceId | string \| null | Reference ID |
| itemCount | number \| null | Number of items |
| items | array \| null | Item details (productId, productName, quantity) |
| actorId | string | User who recorded |
| createdAt | timestamp | Creation time |

#### `leaveRequests`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| employeeId | string | Employee user ID |
| fromDate | timestamp | Leave start date |
| toDate | timestamp | Leave end date |
| reason | string \| null | Leave reason |
| status | string | `PENDING` \| `APPROVED` \| `REJECTED` |
| leaveType | string | `UNPAID` \| `PAID` \| `SICK` |
| reviewedBy | string \| null | Reviewer user ID |
| reviewedAt | timestamp \| null | Review timestamp |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `salaryRecords`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| employeeId | string | Employee user ID |
| month | number | Month (1-12) |
| year | number | Year |
| fullSalary | number | Full monthly salary |
| workingDays | number | Working days in month |
| leaveDays | number | Days on leave |
| perDayRate | number | Calculated per-day rate |
| deduction | number | Calculated deduction |
| payableAmount | number | Final payable amount |
| status | string | `PENDING` \| `APPROVED` \| `PAID` |
| receiptUrl | string \| null | Receipt PDF URL |
| notes | string \| null | Notes |
| createdBy | string | Creator user ID |
| approvedBy | string \| null | Approver user ID |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

### 6.8 Config & Notification Collections

#### `storeSettings`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| storeName | string | Store display name |
| address | string \| null | Store address |
| phone | string \| null | Store phone |
| email | string \| null | Store email |
| gstin | string \| null | GST identification number |
| taxRate | number | Tax rate (0-100) |
| logoUrl | string \| null | Store logo URL |
| whatsappProvider | string | `META` \| `TWILIO` \| `WASENDER` \| `NONE` |
| whatsappApiKey | string \| null | WhatsApp API key |
| whatsappPhoneNumberId | string \| null | WhatsApp phone number ID |
| whatsappTemplateId | string \| null | WhatsApp template ID |
| whatsappTwilioFromNumber | string \| null | Twilio from number |
| workingDaysPerMonth | number | Default working days (default: 26) |
| defaultLeaveType | string | `UNPAID` \| `PAID` (default: UNPAID) |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update |

#### `notificationLogs`

| Field | Type | Description |
|---|---|---|
| orgId | string | Organization scope |
| type | string | `WHATSAPP` \| `EMAIL` |
| recipient | string | Recipient phone/email |
| templateId | string \| null | Template used |
| message | string | Rendered message |
| status | string | `PENDING` \| `SENT` \| `FAILED` |
| error | string \| null | Error message |
| referenceType | string | Related resource type |
| referenceId | string | Related resource ID |
| retryCount | number | Retry attempts |
| createdAt | timestamp | Creation time |

#### `notificationTemplates`

| Field | Type | Description |
|---|---|---|
| storeId | string | Organization scope |
| messageTemplate | string | Template with `{{placeholder}}` syntax |
| placeholders | array | Available placeholder names |
| updatedBy | string | Last editor |
| updatedAt | timestamp | Last update |

#### `whatsappLogs`

| Field | Type | Description |
|---|---|---|
| storeId | string | Organization scope |
| taskId | string \| null | Related task ID |
| toNumber | string | Recipient phone |
| status | string | `SENT` \| `FAILED` \| `SKIPPED` |
| providerMessageId | string \| null | Provider's message ID |
| error | string \| null | Error message |
| attemptCount | number | Attempt count |
| createdAt | timestamp | Creation time |

#### `whatsappDedupe`

| Field | Type | Description |
|---|---|---|
| (key) | string | Dedupe key: `{taskId}|{status}|{toNumber}` |

Prevents duplicate WhatsApp notifications for the same task status change.

### 6.9 Custom Claims (Auth Token)

```json
{
  "orgId": "string",
  "role": "owner | employee"
}
```

Set by `syncUserClaims` Cloud Function. Carried on every Firebase Auth token.

---

## 7. Security & RBAC

### Authentication

- Firebase Auth with Email/Password and Google Sign-In
- Email verification required before onboarding
- Persistent sessions via `car-spa-auth` cookie
- Middleware redirects unauthenticated users to sign-in

### RBAC Permissions

**Owner** — full access to all 46 permissions.

**Employee** — 21 permissions:

| Module | Allowed | Denied |
|---|---|---|
| Organization | read | update, delete |
| Memberships | read | create, update, delete |
| Dashboard | read | — |
| Settings | read | update |
| Customers | read, create | update |
| Vehicle Tasks | read, create, update | delete |
| Inventory | read, create, update | delete, viewCost, viewReports |
| Suppliers | read, create, update | delete |
| POS | read, create | — |
| Employees | read | create, update, delete |
| Mechanics | read | create, update, delete |
| Salary | read | create, approve |
| Leave | read, create | approve |
| Audit | read | — |

### Firestore Security Rules

Every collection enforces:
1. **Authentication** — `request.auth != null`
2. **Org scoping** — `resource.data.orgId == request.auth.token.orgId`
3. **Role-based access** — owner-only for destructive ops (delete, settings update)
4. **Default deny** — catch-all `{document=**}` denies all unmatched access

### App Check

- Debug provider for local development
- reCAPTCHA Enterprise for production

### CSP Headers

Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy configured in `next.config.ts`.

---

## 8. WhatsApp Notifications

### Architecture

```
TaskStatusEvent created (Firestore)
  → Cloud Function trigger (whatsappOnStatusChange)
    → Cloud Tasks queue (whatsappSend)
      → WhatsAppService.notifyStatusChange()
        → Template rendering
        → Deduplication check
        → Provider.send() (Meta/Twilio/Noop)
        → Log result
```

### Provider Abstraction

| Provider | Adapter | Config |
|---|---|---|
| Meta Cloud API | `MetaWhatsAppAdapter` | `WHATSAPP_META_PHONE_NUMBER_ID`, `WHATSAPP_META_ACCESS_TOKEN` |
| Twilio | `TwilioWhatsAppAdapter` | `WHATSAPP_TWILIO_ACCOUNT_SID`, `WHATSAPP_TWILIO_AUTH_TOKEN` |
| Disabled | `NoopWhatsAppAdapter` | — |

Switch provider by setting `WHATSAPP_PROVIDER=meta|twilio|none`.

### Template System

Default template: `Hi {{customerName}}, your vehicle {{vehicleNumber}} status is now {{status}}. - {{storeName}}`

**Available placeholders:** `{{customerName}}`, `{{vehicleNumber}}`, `{{status}}`, `{{storeName}}`, `{{taskId}}`, `{{amountDue}}`

Templates are stored in `notificationTemplates` collection and cached in memory (5 min TTL).

### Deduplication

Key format: `{taskId}|{status}|{toNumber}`. Stored in `whatsappDedupe` collection. Prevents duplicate notifications for the same status change.

### Recipients

Both the store owner (from `storeSettings.phone`) and the customer (from `customers.phone`) receive notifications.

---

## 9. Cloud Functions

| Function | Type | Trigger | Description |
|---|---|---|---|
| `syncUserClaims` | Callable HTTPS | Client call | Sets custom claims (`orgId`, `role`) on Firebase Auth token |
| `whatsappOnStatusChange` | Firestore trigger | `taskStatusEvents` create | Sends WhatsApp notification when task status changes |
| `whatsappOnTaskCreated` | Firestore trigger | `vehicleTasks` create | Sends WhatsApp notification when new task is created |
| `whatsappSend` | Cloud Tasks queue | Queue message | Background processor for async WhatsApp message delivery |

**Region:** `asia-south1` (all functions)

**syncUserClaims validation:**
- Requires authentication
- `userId`, `orgId`, `role` are required
- Can only sync own claims unless caller is owner

---

## 10. Testing

### Unit Tests (Vitest)

```bash
npm run test              # All packages
npm run test --workspace=@car-spa/shared
npm run test --workspace=@car-spa/domain
npm run test --workspace=@car-spa/application
npm run test --workspace=@car-spa/infrastructure
```

| Package | Test Files | Coverage |
|---|---|---|
| shared | `permissions.test.ts` | RBAC logic |
| domain | `domain.test.ts`, `notification-template.test.ts`, `salary-calculation.test.ts`, `stock-deduction.test.ts`, `vehicle-task.test.ts` | Entities, schemas, business rules |
| application | `bootstrap-org.test.ts`, `notify-status-change.test.ts`, `whatsapp.service.test.ts` | Use cases, services |
| infrastructure | `app-check.test.ts`, `app-url.test.ts`, `auth-errors.test.ts`, `mappers.test.ts`, `whatsapp-config.test.ts` | Adapters, config |

### Integration Tests

```bash
npm run test:integration   # infrastructure package only
```

Tests Firestore security rules structure and tenancy policies using `@firebase/rules-unit-testing`.

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Smoke tests: auth redirect, sign-in page render, sign-up page render.

### Firebase Emulator Suite

```bash
npm run emulators          # Start emulators only
npm run dev:emu            # Start emulators + Next.js dev server
```

Emulator ports: Auth (9099), Firestore (8080), Functions (5001), Storage (9199), UI (4000).

---

## 11. Deployment

### Environments

| Branch | Environment | Target |
|---|---|---|
| `develop` | Staging | Preview deploy (optional) |
| `main` | Production | Production deploy |

### Firebase Deploy

```bash
npx firebase-tools@latest use big-bull-car-spa
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage,functions
```

### Next.js (Vercel recommended)

1. Link repository to Vercel
2. Set root directory to `apps/web`
3. Configure `NEXT_PUBLIC_FIREBASE_*` environment variables
4. Enable preview deployments on PRs to `develop`

### Docker

```bash
docker-compose up          # Web + Firebase emulators
```

**Dockerfile:** Multi-stage build (base → deps → builder → runner). Runs as non-root `nextjs` user on port 3000.

### Branch Protection

- `main` and `develop` are protected
- Feature branches target `develop` only
- Require PR approval and passing CI

---

## 12. Environment Variables

### Required (Firebase Web SDK)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web SDK API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

### Optional (Firebase)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | GA measurement ID |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` | App Check debug token |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | reCAPTCHA Enterprise site key |

### Optional (Organization)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_DEFAULT_ORG_NAME` | `Big Bull Car Spa` | Default org bootstrap name |

### Optional (WhatsApp)

| Variable | Default | Description |
|---|---|---|
| `WHATSAPP_PROVIDER` | `none` | Active provider: `meta` \| `twilio` \| `none` |
| `WHATSAPP_META_PHONE_NUMBER_ID` | — | Meta WhatsApp Phone Number ID |
| `WHATSAPP_META_ACCESS_TOKEN` | — | Meta access token |
| `WHATSAPP_META_BUSINESS_ACCOUNT_ID` | — | Meta WABA ID |
| `WHATSAPP_META_API_VERSION` | `v20.0` | Meta API version |
| `WHATSAPP_META_WEBHOOK_VERIFY_TOKEN` | — | Webhook verification token |
| `WHATSAPP_TWILIO_ACCOUNT_SID` | — | Twilio account SID |
| `WHATSAPP_TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `WHATSAPP_TWILIO_FROM_NUMBER` | — | Twilio WhatsApp from number |
| `WHATSAPP_DEFAULT_COUNTRY_CODE` | `91` | Default country code for phone normalization |
| `WHATSAPP_MAX_RETRIES` | `3` | Max retry attempts |
| `WHATSAPP_RETRY_BACKOFF_MS` | `2000` | Retry backoff in ms |
| `WHATSAPP_RATE_LIMIT_PER_SECOND` | `8` | Rate limit |

---

## 13. Development Guide

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`

### Setup

```bash
cp .env.example apps/web/.env.local
# Fill NEXT_PUBLIC_FIREBASE_* from Firebase Console

npm install
npm run dev
```

### Using Firebase Emulators

```bash
npm run dev:emu
```

This starts Firebase emulators with imported data from `firebase/emulator-data/` and the Next.js dev server simultaneously.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run dev:emu` | Start emulators + dev server |
| `npm run build` | Build all workspaces |
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | Firestore rules tests |
| `npm run test:e2e` | Playwright tests |
| `npm run typecheck` | TypeScript check all workspaces |
| `npm run lint` | ESLint all workspaces |
| `npm run format` | Prettier format |
| `npm run format:check` | Prettier check |

### Adding a New Feature Module

1. Create directory: `apps/web/src/features/<module>/`
2. Add subdirectories: `ui/`, `api/`, `hooks/`, `stores/` (as needed)
3. Add entity to `packages/domain/src/entities.ts`
4. Add Zod schema to `packages/domain/src/validation.ts`
5. Add repository port to `packages/application/src/ports.ts`
6. Add use case to `packages/application/src/use-cases/<module>.ts`
7. Add Firestore repository to `packages/infrastructure/src/repositories/`
8. Wire in DI container: `packages/infrastructure/src/container.ts`
9. Add Firestore rules to `firebase/firestore.rules`
10. Add route to `apps/web/src/app/(dashboard)/<module>/`
11. Add permissions to `packages/shared/src/permissions.ts`

### Adding a New Use Case

1. Define input Zod schema in `packages/domain/src/validation.ts`
2. Create use case class in `packages/application/src/use-cases/`
3. Constructor-inject repository ports
4. Validate input with Zod: `const parsed = schema.safeParse(input)`
5. Return `Result<T, E>` using `ok()` and `err()`
6. Log audit trail via `auditRepo.log()`
7. Wire in container: `packages/infrastructure/src/container.ts`
8. Export from `packages/application/src/index.ts`

### Key Patterns

- **Result type:** All use cases return `Result<T, E>` — never throw
- **Org scoping:** Every Firestore query includes `orgId` filter
- **RBAC:** `requirePermission(ctx, 'permission:name')` before business logic
- **Audit logging:** Every write operation logs to `auditLogs` collection
- **Zod validation:** All inputs validated at use case boundary
- **Derived stock:** `currentStock` on products is updated on every movement

---

## 14. Key Patterns & Conventions

### Result Type Pattern

```typescript
// Instead of throwing:
const result = await useCase.execute(input, orgId, actorId);
if (isErr(result)) {
  // handle error
  return;
}
const value = unwrap(result);
```

### Multi-Tenancy

Every Firestore document has an `orgId` field. Every query filters by `orgId`. Custom claims on Firebase Auth tokens carry `orgId` and `role`.

### Stock Movement Ledger

Stock is **never written directly** on product documents. `currentStock` is **derived** by aggregating all `StockMovement` records. Movement types:
- `RESTOCK_IN` — adds stock
- `MANUAL_OUT` — manual removal
- `POS_SALE` — auto-deducted on POS sale
- `VEHICLE_TASK_USE` — auto-deducted on vehicle task

### Audit Trail

Every use case that modifies data calls `auditRepo.log()` with:
- `orgId` — tenant scope
- `actorId` — user who performed action
- `action` — e.g., `vehicleTask.create`, `stockMovement.create`
- `resourceType` + `resourceId` — what was affected
- `metadata` — additional context

Audit logs are **append-only** (update/delete denied in Firestore rules).

### Vehicle Task Code Generation

Format: `VT-{YYYY}-{NNNN}` (e.g., `VT-2026-0001`). Sequence is per-org per-year.

### Phone Normalization

Indian mobile numbers normalized to E.164 format: `+91XXXXXXXXXX`. Validates 10-digit numbers starting with 6-9.

### Auto-SKU Generation

Format: `{CATEGORY_PREFIX}-{SEQUENCE}` (e.g., `OIL-0001`). Sequence is per-org per-prefix, stored in `sequences` collection.

### TypeScript Configuration

- Target: ES2022
- Strict mode enabled
- `noUncheckedIndexedAccess: true`
- Module: ESNext with bundler resolution
- Declaration maps and source maps enabled
