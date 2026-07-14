import type { ReceiptService } from '@car-spa/application';
import type { PosOrderRepository } from '@car-spa/application';

export class ClientReceiptService implements ReceiptService {
  constructor(private readonly posRepo: PosOrderRepository) {}

  async generateReceipt(orderId: string, orgId: string) {
    const order = await this.posRepo.findById(orgId, orderId);
    if (!order) throw new Error('Order not found');

    const lines = order.items
      .map(
        (item) =>
          `<tr><td>${item.description}</td><td>${item.quantity}</td><td>₹${item.unitPrice.toFixed(2)}</td><td>₹${item.lineTotal.toFixed(2)}</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><title>Receipt ${orderId}</title></head><body>
      <h1>Big Bull Car Spa</h1>
      <p>Order: ${orderId}</p>
      <table border="1" cellpadding="8"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${lines}</tbody></table>
      <p>Subtotal: ₹${order.subtotal.toFixed(2)}</p>
      <p>Tax: ₹${order.tax.toFixed(2)}</p>
      <p><strong>Total: ₹${order.total.toFixed(2)}</strong></p>
      <p>Status: ${order.status}</p>
    </body></html>`;

    return { receiptId: `receipt-${orderId}`, html };
  }
}
