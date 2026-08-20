import type { Product, StockMovement, Supplier, SupplierPurchaseEntry } from '@car-spa/domain';
import {
  categorySchema,
  productSchema,
  stockMovementSchema,
  supplierPurchaseEntrySchema,
  supplierSchema,
} from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  CategoryRepository,
  ProductRepository,
  StockMovementRepository,
  SupplierPurchaseRepository,
  SupplierRepository,
} from '../ports';

export class CreateCategoryUseCase {
  constructor(
    private readonly catRepo: CategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<{ id: string }>> {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const existing = await this.catRepo.findByCodePrefix(orgId, parsed.data.codePrefix);
      if (existing) return err(new Error(`Prefix "${parsed.data.codePrefix}" already in use`));
      const category = await this.catRepo.create({ orgId, ...parsed.data });
      void this.auditRepo
        .log({
          orgId,
          actorId,
          action: 'category.create',
          resourceType: 'category',
          resourceId: category.id,
        })
        .catch(() => {});
      return ok({ id: category.id });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create category'));
    }
  }
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly catRepo: CategoryRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Product>> {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const category = await this.catRepo.findById(parsed.data.categoryId);
      if (!category) return err(new Error('Category not found'));
      if (parsed.data.costPrice > parsed.data.sellingPrice)
        return err(new Error('Cost price cannot exceed selling price'));
      if (parsed.data.sellingPrice <= 0) return err(new Error('Selling price must be positive'));

      const schemaKeys = category.attributeSchema.map((a) => a.key);
      for (const attr of category.attributeSchema) {
        if (
          attr.required &&
          (parsed.data.attributeValues[attr.key] === undefined ||
            parsed.data.attributeValues[attr.key] === '')
        ) {
          return err(new Error(`"${attr.label}" is required`));
        }
      }
      for (const key of Object.keys(parsed.data.attributeValues)) {
        if (!schemaKeys.includes(key)) return err(new Error(`Unknown attribute "${key}"`));
      }

      const product = await this.productRepo.createWithSequence({
        orgId,
        codePrefix: category.codePrefix,
        actorId,
        data: {
          currentStock: parsed.data.initialStock,
          categoryId: parsed.data.categoryId,
          name: parsed.data.name,
          attributeValues: parsed.data.attributeValues,
          costPrice: parsed.data.costPrice,
          sellingPrice: parsed.data.sellingPrice,
          unit: parsed.data.unit,
          lowStockThreshold: parsed.data.lowStockThreshold,
          expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
          imageUrl: parsed.data.imageUrl || null,
          supplierId: parsed.data.supplierId || null,
          notes: parsed.data.notes || null,
        },
      });

      void this.auditRepo
        .log({
          orgId,
          actorId,
          action: 'product.create',
          resourceType: 'product',
          resourceId: product.id,
          metadata: { sku: product.sku },
        })
        .catch(() => {});
      return ok(product);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create product'));
    }
  }
}

export class RecordStockMovementUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<StockMovement>> {
    const parsed = stockMovementSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const product = await this.productRepo.findById(parsed.data.productId);
      if (!product) return err(new Error('Product not found'));

      const isOut =
        parsed.data.type === 'MANUAL_OUT' ||
        parsed.data.type === 'POS_SALE' ||
        parsed.data.type === 'VEHICLE_TASK_USE' ||
        parsed.data.type === 'MECHANIC_ISSUE';
      const currentStock = product.currentStock;
      if (isOut && currentStock < parsed.data.quantity)
        return err(new Error(`Insufficient stock. Available: ${currentStock}`));

      const movement = await this.movementRepo.create({
        orgId,
        productId: parsed.data.productId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        note: parsed.data.note,
        referenceId: parsed.data.referenceId || null,
        supplierId: isOut ? null : parsed.data.supplierId || null,
        actorId,
        serialNumbers: null,
      });

      const delta = isOut ? -parsed.data.quantity : parsed.data.quantity;
      await this.productRepo.updateCurrentStock(parsed.data.productId, currentStock + delta);

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'stockMovement.create',
        resourceType: 'stockMovement',
        resourceId: movement.id,
        metadata: { productId: product.id, type: parsed.data.type, quantity: parsed.data.quantity },
      });
      return ok(movement);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to record stock movement'));
    }
  }
}

export class AutoDeductStockUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    productId: string,
    quantity: number,
    type: 'POS_SALE' | 'VEHICLE_TASK_USE',
    referenceId: string,
    orgId: string,
    actorId: string,
  ): Promise<Result<StockMovement>> {
    return new RecordStockMovementUseCase(
      this.productRepo,
      this.movementRepo,
      this.auditRepo,
    ).execute(
      {
        productId,
        type,
        quantity,
        note: `Auto deduction from ${type === 'POS_SALE' ? 'POS sale' : 'vehicle task'}`,
        referenceId,
      },
      orgId,
      actorId,
    );
  }
}

export class CreateSupplierUseCase {
  constructor(
    private readonly supplierRepo: SupplierRepository,
    private readonly purchaseRepo: SupplierPurchaseRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Supplier>> {
    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const supplier = await this.supplierRepo.create({
        orgId,
        name: parsed.data.name,
        contactPhone: parsed.data.contactPhone || null,
        notes: parsed.data.notes || null,
        totalAmount: 0,
        advanceAmount: 0,
        toBePaid: 0,
      });

      if (parsed.data.toBePaid > 0) {
        await this.purchaseRepo.create({
          orgId,
          supplierId: supplier.id,
          type: 'PURCHASE',
          amount: parsed.data.toBePaid,
          description: 'Opening balance to be paid',
          referenceType: 'OPENING',
          referenceId: null,
          actorId,
        });
        await this.supplierRepo.updateAmounts(supplier.id, {
          totalAmount: parsed.data.toBePaid,
          toBePaid: parsed.data.toBePaid,
        });
      }

      if (parsed.data.advanceAmount > 0) {
        await this.purchaseRepo.create({
          orgId,
          supplierId: supplier.id,
          type: 'ADVANCE',
          amount: parsed.data.advanceAmount,
          description: 'Opening advance payment',
          referenceType: 'OPENING',
          referenceId: null,
          actorId,
        });
        await this.supplierRepo.updateAmounts(supplier.id, {
          advanceAmount: parsed.data.advanceAmount,
          toBePaid: -parsed.data.advanceAmount,
        });
      }

      const saved = await this.supplierRepo.findById(supplier.id);
      void this.auditRepo
        .log({
          orgId,
          actorId,
          action: 'supplier.create',
          resourceType: 'supplier',
          resourceId: supplier.id,
          metadata: {
            toBePaid: parsed.data.toBePaid,
            advanceAmount: parsed.data.advanceAmount,
          },
        })
        .catch(() => {});
      return ok(saved ?? supplier);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create supplier'));
    }
  }
}

export class AddSupplierPurchaseEntryUseCase {
  constructor(
    private readonly supplierRepo: SupplierRepository,
    private readonly purchaseRepo: SupplierPurchaseRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    input: unknown,
    orgId: string,
    actorId: string,
  ): Promise<Result<SupplierPurchaseEntry>> {
    const parsed = supplierPurchaseEntrySchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const supplier = await this.supplierRepo.findById(parsed.data.supplierId);
      if (!supplier) return err(new Error('Supplier not found'));

      const entry = await this.purchaseRepo.create({
        orgId,
        supplierId: parsed.data.supplierId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        referenceType: null,
        referenceId: null,
        actorId,
      });

      await this.supplierRepo.updateAmounts(supplier.id, {
        totalAmount: parsed.data.type === 'PURCHASE' ? parsed.data.amount : undefined,
        advanceAmount: parsed.data.type === 'ADVANCE' ? parsed.data.amount : undefined,
        toBePaid: parsed.data.type === 'PURCHASE' ? parsed.data.amount : -parsed.data.amount,
      });

      void this.auditRepo
        .log({
          orgId,
          actorId,
          action: 'supplierPurchase.create',
          resourceType: 'supplierPurchaseEntry',
          resourceId: entry.id,
          metadata: {
            supplierId: supplier.id,
            type: parsed.data.type,
            amount: parsed.data.amount,
          },
        })
        .catch(() => {});

      return ok(entry);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to add purchase entry'));
    }
  }
}
