import type { Mechanic, MechanicLedgerEntry, StockMovement } from '@car-spa/domain';
import { mechanicLedgerEntrySchema, mechanicSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  MechanicLedgerRepository,
  MechanicRepository,
  ProductRepository,
  StockMovementRepository,
} from '../ports';

export class CreateMechanicUseCase {
  constructor(
    private readonly mechanicRepo: MechanicRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Mechanic>> {
    const parsed = mechanicSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const mechanic = await this.mechanicRepo.create({
        orgId,
        name: parsed.data.name,
        storeName: parsed.data.storeName,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        balance: 0,
        active: true,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'mechanic.create',
        resourceType: 'mechanic',
        resourceId: mechanic.id,
      });

      return ok(mechanic);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create mechanic'));
    }
  }
}

export class AddMechanicLedgerEntryUseCase {
  constructor(
    private readonly mechanicRepo: MechanicRepository,
    private readonly ledgerRepo: MechanicLedgerRepository,
    private readonly auditRepo: AuditRepository,
    private readonly productRepo: ProductRepository,
    private readonly stockMovementRepo: StockMovementRepository,
  ) {}

  async execute(
    input: unknown,
    orgId: string,
    actorId: string,
  ): Promise<Result<MechanicLedgerEntry>> {
    const parsed = mechanicLedgerEntrySchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const mechanic = await this.mechanicRepo.findById(parsed.data.mechanicId);
      if (!mechanic) {
        return err(new Error('Mechanic not found'));
      }

      const items = parsed.data.items ?? null;
      const isDebit = parsed.data.type === 'DEBIT';

      if (isDebit && items && items.length > 0) {
        const productIds = items.map((it) => it.productId);
        const products = await this.productRepo.findByIds(productIds);
        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) {
            return err(new Error(`Product not found: ${item.productName}`));
          }
          if (product.currentStock < item.quantity) {
            return err(
              new Error(
                `Insufficient stock for ${product.name}: ${product.currentStock} available, ${item.quantity} requested`,
              ),
            );
          }
        }

        const delta = parsed.data.amount;
        await this.mechanicRepo.updateBalance(mechanic.id, delta);

        const entry = await this.ledgerRepo.create({
          orgId,
          mechanicId: parsed.data.mechanicId,
          type: parsed.data.type,
          amount: parsed.data.amount,
          description: parsed.data.description,
          referenceType: null,
          referenceId: null,
          itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
          items,
          actorId,
        });

        for (const item of items) {
          const product = productMap.get(item.productId)!;
          const newStock = product.currentStock - item.quantity;

          await this.stockMovementRepo.create({
            orgId,
            productId: item.productId,
            type: 'MECHANIC_ISSUE',
            quantity: item.quantity,
            note: `Issued to mechanic ${mechanic.name}`,
            referenceId: entry.id,
            supplierId: null,
            actorId,
            serialNumbers: null,
          });

          await this.productRepo.updateCurrentStock(item.productId, newStock);
        }

        await this.auditRepo.log({
          orgId,
          actorId,
          action: 'mechanicLedger.create',
          resourceType: 'mechanicLedgerEntry',
          resourceId: entry.id,
          metadata: {
            mechanicId: mechanic.id,
            type: parsed.data.type,
            amount: parsed.data.amount,
            itemCount: items.length,
          },
        });

        return ok(entry);
      }

      const delta = isDebit ? parsed.data.amount : -parsed.data.amount;

      const derivedItemCount =
        parsed.data.itemCount ?? (items ? items.length : null);

      await this.mechanicRepo.updateBalance(mechanic.id, delta);

      const entry = await this.ledgerRepo.create({
        orgId,
        mechanicId: parsed.data.mechanicId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        referenceType: null,
        referenceId: null,
        itemCount: derivedItemCount,
        items: items ?? null,
        actorId,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'mechanicLedger.create',
        resourceType: 'mechanicLedgerEntry',
        resourceId: entry.id,
        metadata: { mechanicId: mechanic.id, type: parsed.data.type, amount: parsed.data.amount },
      });

      return ok(entry);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to add ledger entry'));
    }
  }
}
