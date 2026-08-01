import type { POSSale } from '@car-spa/domain';
import { posSaleSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  CustomerRepository,
  ProductRepository,
  POSSaleRepository,
  StockMovementRepository,
} from '../ports';

function generateReceiptNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const unique = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).slice(0, 6).toUpperCase();
  return `RCT-${yyyy}${mm}${dd}-${unique}`;
}

export class CreatePOSSaleUseCase {
  constructor(
    private readonly saleRepo: POSSaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly stockMovementRepo: StockMovementRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<POSSale>> {
    const parsed = posSaleSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      let customerId = parsed.data.customerId || null;
      const saleItems = [];
      let totalAmount = 0;
      const receiptNumber = generateReceiptNumber();

      for (const item of parsed.data.items) {
        if (item.itemId) {
          const product = await this.productRepo.findById(item.itemId);
          if (!product) return err(new Error(`Product ${item.itemId} not found`));
          const stock = await this.stockMovementRepo.getDerivedStock(item.itemId);
          if (stock < item.quantity) return err(new Error(`Insufficient stock for ${product.name}: ${stock} available`));

          const totalPrice = item.quantity * item.unitPrice;
          totalAmount += totalPrice;

          saleItems.push({
            id: '', saleId: '',
            itemId: item.itemId, itemName: product.name,
            quantity: item.quantity, unitPrice: item.unitPrice, totalPrice,
          });

          await this.stockMovementRepo.create({
            orgId, productId: item.itemId, type: 'POS_SALE',
            quantity: item.quantity, note: 'POS sale',
            referenceId: '', supplierId: null, actorId, serialNumbers: null,
          });
          await this.productRepo.updateCurrentStock(item.itemId, stock - item.quantity);
        } else {
          const itemName = item.itemName || 'Service';
          const totalPrice = item.quantity * item.unitPrice;
          totalAmount += totalPrice;

          saleItems.push({
            id: '', saleId: '',
            itemId: '', itemName,
            quantity: item.quantity, unitPrice: item.unitPrice, totalPrice,
          });
        }
      }

      const sale = await this.saleRepo.create({
        orgId, customerId,
        items: saleItems.map(si => ({
          ...si, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        })),
        totalAmount, paymentMode: parsed.data.paymentMode,
        receiptNumber, receiptUrl: null, createdBy: actorId,
      });

      const updatedItems = saleItems.map(si => ({ ...si, saleId: sale.id }));
      const finalSale = { ...sale, items: updatedItems };

      if (customerId) {
        const customer = await this.customerRepo.findById(customerId);
        if (customer) {
          await this.customerRepo.update(customerId, { totalSpend: customer.totalSpend + totalAmount });
        }
      }

      await this.auditRepo.log({ orgId, actorId, action: 'posSale.create', resourceType: 'posSale', resourceId: sale.id, metadata: { amount: totalAmount, itemCount: saleItems.length } });
      return ok(finalSale);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create POS sale'));
    }
  }
}
