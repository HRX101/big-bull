import type { Product, StockMovement, Supplier } from '@car-spa/domain';
import { categorySchema, productSchema, stockMovementSchema, supplierSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  CategoryRepository,
  ProductRepository,
  StockMovementRepository,
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
      await this.auditRepo.log({ orgId, actorId, action: 'category.create', resourceType: 'category', resourceId: category.id });
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
    private readonly stockMovementRepo: StockMovementRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Product>> {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const category = await this.catRepo.findById(parsed.data.categoryId);
      if (!category) return err(new Error('Category not found'));
      if (parsed.data.costPrice > parsed.data.sellingPrice) return err(new Error('Cost price cannot exceed selling price'));
      if (parsed.data.sellingPrice <= 0) return err(new Error('Selling price must be positive'));

      const schemaKeys = category.attributeSchema.map(a => a.key);
      for (const attr of category.attributeSchema) {
        if (attr.required && (parsed.data.attributeValues[attr.key] === undefined || parsed.data.attributeValues[attr.key] === '')) {
          return err(new Error(`"${attr.label}" is required`));
        }
      }
      for (const key of Object.keys(parsed.data.attributeValues)) {
        if (!schemaKeys.includes(key)) return err(new Error(`Unknown attribute "${key}"`));
      }

      const seq = await this.catRepo.getNextSequence(orgId, category.codePrefix);
      const sku = `${category.codePrefix}-${String(seq).padStart(4, '0')}`;

      const product = await this.productRepo.create({
        orgId, sku, currentStock: 0,
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
      });

      if (parsed.data.initialStock > 0) {
        await this.stockMovementRepo.create({
          orgId, productId: product.id, type: 'RESTOCK_IN',
          quantity: parsed.data.initialStock, note: 'Initial stock',
          referenceId: null, supplierId: parsed.data.supplierId || null,
          actorId, serialNumbers: null,
        });
        await this.productRepo.updateCurrentStock(product.id, parsed.data.initialStock);
      }

      await this.auditRepo.log({ orgId, actorId, action: 'product.create', resourceType: 'product', resourceId: product.id, metadata: { sku } });
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

      const isOut = parsed.data.type === 'MANUAL_OUT' || parsed.data.type === 'POS_SALE' || parsed.data.type === 'VEHICLE_TASK_USE';
      const currentStock = await this.movementRepo.getDerivedStock(parsed.data.productId);
      if (isOut && currentStock < parsed.data.quantity) return err(new Error(`Insufficient stock. Available: ${currentStock}`));

      const movement = await this.movementRepo.create({
        orgId, productId: parsed.data.productId, type: parsed.data.type,
        quantity: parsed.data.quantity, note: parsed.data.note,
        referenceId: parsed.data.referenceId || null,
        supplierId: isOut ? null : (parsed.data.supplierId || null),
        actorId, serialNumbers: null,
      });

      const delta = isOut ? -parsed.data.quantity : parsed.data.quantity;
      await this.productRepo.updateCurrentStock(parsed.data.productId, currentStock + delta);

      await this.auditRepo.log({ orgId, actorId, action: 'stockMovement.create', resourceType: 'stockMovement', resourceId: movement.id, metadata: { productId: product.id, type: parsed.data.type, quantity: parsed.data.quantity } });
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

  async execute(productId: string, quantity: number, type: 'POS_SALE' | 'VEHICLE_TASK_USE', referenceId: string, orgId: string, actorId: string): Promise<Result<StockMovement>> {
    return new RecordStockMovementUseCase(this.productRepo, this.movementRepo, this.auditRepo).execute(
      { productId, type, quantity, note: `Auto deduction from ${type === 'POS_SALE' ? 'POS sale' : 'vehicle task'}`, referenceId },
      orgId, actorId,
    );
  }
}

export class CreateSupplierUseCase {
  constructor(
    private readonly supplierRepo: SupplierRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Supplier>> {
    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const supplier = await this.supplierRepo.create({ orgId, ...parsed.data, contactPhone: parsed.data.contactPhone || null, notes: parsed.data.notes || null });
      await this.auditRepo.log({ orgId, actorId, action: 'supplier.create', resourceType: 'supplier', resourceId: supplier.id });
      return ok(supplier);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create supplier'));
    }
  }
}
