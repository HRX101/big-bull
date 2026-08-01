# Inventory Module — Rewrite Summary

## Overview
Replaced the flat `InventoryCategory` / `InventoryItem` model with a **4-entity domain**:
- **Category** — named group with a `codePrefix` (e.g. `OIL`) used for auto-SKU generation, a `lowStockThresholdDefault`, `hasExpiry` flag, and an `attributeSchema` (array of `AttributeDefinition`) for dynamic product forms.
- **Product** — individual stockable item with `sku` (system-generated `{prefix}-{seq}`), `name`, `categoryId`, `costPrice`, `sellingPrice`, `unit`, `currentStock` (derived, not direct writes), `lowStockThreshold`, `attributeValues` (record matching category schema), and `expiryDate`.
- **StockMovement** — append-only ledger with fields `productId`, `type` (`RESTOCK_IN | MANUAL_OUT | POS_SALE | VEHICLE_TASK_USE`), `quantity`, `note`, optional `supplierId`, and `performedBy`. Stock is **never written directly**; `currentStock` is derived by aggregating all movements.
- **Supplier** — vendor record with `name`, `phone`, `email`, `address`, `gstin`, and `isActive`.

## Layer-by-layer changes

### `packages/shared/`
- **`constants.ts`** — new collection names: `categories`, `products`, `stockMovements`, `suppliers`. New enums `STOCK_MOVEMENT_TYPES`, `UNITS`.
- **`permissions.ts`** — added `inventory:viewCost`, `inventory:viewReports`, `supplier:*`.

### `packages/domain/`
- **`entities.ts`** — replaced `InventoryCategory`, `InventoryItem` with `Category`, `Product`, `StockMovement`, `Supplier`, `AttributeDefinition`.
- **`validation.ts`** — new Zod schemas `categorySchema`, `productSchema`, `stockMovementSchema`, `supplierSchema`.

### `packages/application/`
- **`ports.ts`** — 4 new repository interfaces: `CategoryRepository` (includes `findByCodePrefix`, `getNextSequence`), `ProductRepository` (includes `search`, `updateCurrentStock`, `getLowStock`, `getStockValue`, `getExpiringSoon`), `StockMovementRepository` (includes `getDerivedStock`), `SupplierRepository`.
- **`use-cases/inventory.ts`** — 5 use cases:
  - `CreateCategoryUseCase` — validates prefix uniqueness + schema, delegates to repo.
  - `CreateProductUseCase` — auto-generates SKU (`{codePrefix}-{nextSeq}`), validates category exists + attribute values match schema, calls `ProductRepository.create`.
  - `RecordStockMovementUseCase` — validates stock never goes negative, creates append-only movement.
  - `AutoDeductStockUseCase` — records movement from POS or vehicle-task contexts (called by those use cases).
  - `CreateSupplierUseCase` — validates + creates supplier.
- **`use-cases/pos.ts`** — updated to use `ProductRepository` + `AutoDeductStockUseCase` instead of old `InventoryItemRepository`.

### `packages/infrastructure/`
- **`repositories/`** — 4 new Firestore repos:
  - `category.repository.ts` — queries categories by org, checks prefix duplicates, gets next sequence via a `/{orgId}/sequences/{prefix}` counter document.
  - `product.repository.ts` — CRUD + search by name/SKU/category with text filtering, `getLowStock`, `getStockValue` (sum of `costPrice * currentStock`), `getExpiringSoon`.
  - `stock-movement.repository.ts` — append-only writes with transaction, `getDerivedStock` aggregates all movements for a product.
  - `supplier.repository.ts` — basic CRUD.
- **`container.ts`** — wired all new repos and use cases.
- **`index.ts`** — re-exported new repos/use cases.

### `apps/web/`
- **`features/inventory/`**:
  - **`api/use-inventory.ts`** — React Query hooks for all new repos/use cases (categories CRUD, products CRUD + search, stock ledger, suppliers CRUD).
  - **`ui/inventory-page.tsx`** — 4-tab UI:
    - **Categories** — list, create (with dynamic attribute builder), edit, delete.
    - **Products** — filter by category, search by name/SKU/category, low-stock badge, create form driven by selected category's `attributeSchema`.
    - **Stock Ledger** — select product → see derived stock + movement history + record restock/adjustment.
    - **Suppliers** — list, create, edit, delete.
- **`features/pos/`** — updated to use `Product` fields (`sellingPrice`, `currentStock`, `sku`).
- **`features/dashboard/`** — updated to use `productRepository` + `currentStock`.

### `firebase/`
- **`firestore.rules`** — updated with new collection names (`categories`, `products`, `stockMovements`, `suppliers`).

## Data model notes
- SKUs are auto-generated — no manual entry.
- Stock is always derived from movements — never stored directly on the product document.
- Categories define the dynamic form schema for products via `attributeDefinitions` — products in that category must provide matching `attributeValues`.
- The `lowStockThreshold` on a product defaults from its category at creation time.
