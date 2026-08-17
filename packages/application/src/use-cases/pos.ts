import type { POSSale } from '@car-spa/domain';
import { posSaleSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  CustomerRepository,
  ProductRepository,
  POSSaleRepository,
  SerializedItemRepository,
} from '../ports';

function generateReceiptNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const unique = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    .slice(0, 6)
    .toUpperCase();
  return `RCT-${yyyy}${mm}${dd}-${unique}`;
}

export class CreatePOSSaleUseCase {
  constructor(
    private readonly saleRepo: POSSaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly serializedItemRepo: SerializedItemRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<POSSale>> {
    const parsed = posSaleSchema.safeParse(input);
    if (!parsed.success) return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    try {
      const customerId = parsed.data.customerId || null;
      const receiptNumber = generateReceiptNumber();

      const productIds = parsed.data.items
        .map((item) => item.itemId)
        .filter((id): id is string => !!id);
      const products = await this.productRepo.findByIds(productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      const saleItems: Array<{
        id: string;
        itemId: string;
        itemName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        serialNumbers: string[] | null;
      }> = [];
      const movements: Array<{
        orgId: string;
        productId: string;
        type: 'POS_SALE';
        quantity: number;
        note: string;
        referenceId: null;
        supplierId: null;
        actorId: string;
        serialNumbers: string[] | null;
      }> = [];
      const stockDeltas: Array<{ productId: string; delta: number }> = [];
      const serializedItemIds: string[] = [];
      let totalAmount = 0;

      for (const item of parsed.data.items) {
        if (item.itemId) {
          const product = productMap.get(item.itemId);
          if (!product) return err(new Error(`Product ${item.itemId} not found`));

          let serialNumbers: string[] | null = null;
          const availableSerials = await this.serializedItemRepo.findAvailableByProductId(
            item.itemId,
            { limit: 500 },
          );
          if (availableSerials.length > 0) {
            if (!item.serialNumbers || item.serialNumbers.length === 0)
              return err(new Error(`Select serial numbers for ${product.name}`));
            if (item.serialNumbers.length !== item.quantity)
              return err(
                new Error(`Select exactly ${item.quantity} serial number(s) for ${product.name}`),
              );
            const availableMap = new Map(availableSerials.map((s) => [s.serialNumber, s]));
            const seen = new Set<string>();
            for (const serialNumber of item.serialNumbers) {
              if (seen.has(serialNumber))
                return err(new Error(`Duplicate serial ${serialNumber} for ${product.name}`));
              seen.add(serialNumber);
              const serial = availableMap.get(serialNumber);
              if (!serial)
                return err(
                  new Error(`Serial ${serialNumber} is not available for ${product.name}`),
                );
              serializedItemIds.push(serial.id);
            }
            serialNumbers = [...item.serialNumbers];
          }

          const stock = product.currentStock;
          if (stock < item.quantity)
            return err(new Error(`Insufficient stock for ${product.name}: ${stock} available`));

          const totalPrice = item.quantity * item.unitPrice;
          totalAmount += totalPrice;

          saleItems.push({
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            itemId: item.itemId,
            itemName: product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
            serialNumbers,
          });
          movements.push({
            orgId,
            productId: item.itemId,
            type: 'POS_SALE',
            quantity: item.quantity,
            note: serialNumbers ? `POS sale · ${serialNumbers.join(', ')}` : 'POS sale',
            referenceId: null,
            supplierId: null,
            actorId,
            serialNumbers,
          });
          stockDeltas.push({ productId: item.itemId, delta: -item.quantity });
        } else {
          const itemName = item.itemName || 'Service';
          const totalPrice = item.quantity * item.unitPrice;
          totalAmount += totalPrice;

          saleItems.push({
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            itemId: '',
            itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
            serialNumbers: null,
          });
        }
      }

      let customerSpendDelta: number | undefined;
      if (customerId) {
        const customer = await this.customerRepo.findById(customerId);
        if (customer) customerSpendDelta = totalAmount;
      }

      const sale = await this.saleRepo.createSaleBatch({
        orgId,
        customerId,
        items: saleItems,
        totalAmount,
        paymentMode: parsed.data.paymentMode,
        receiptNumber,
        createdBy: actorId,
        movements,
        stockDeltas,
        serializedItemIds,
        customerSpendDelta,
        audit: {
          actorId,
          action: 'posSale.create',
          resourceType: 'posSale',
          resourceId: '',
          metadata: { amount: totalAmount, itemCount: saleItems.length },
        },
      });
      return ok(sale);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create POS sale'));
    }
  }
}
