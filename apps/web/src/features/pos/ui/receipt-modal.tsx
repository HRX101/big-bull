'use client';

import { Printer, X } from 'lucide-react';
import type { POSSale } from '@car-spa/domain';
import { Button } from '@/components/ui/button';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net Banking',
  OTHER: 'Other',
};

function formatRupee(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReceiptModal({
  sale,
  customerName,
  onClose,
}: {
  sale: POSSale | null;
  customerName?: string | null;
  onClose: () => void;
}) {
  if (!sale) return null;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <div id="receipt-print" className="bg-background w-full max-w-sm rounded-lg shadow-lg overflow-hidden print:shadow-none">
          <div className="border-b p-4 text-center">
            <p className="font-display text-lg font-bold tracking-tight">Big Bull Car Spa</p>
            <p className="text-muted-foreground text-xs">Workshop &amp; Service</p>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Receipt No.</span>
              <span className="font-mono font-semibold">{sale.receiptNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date(sale.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span>{customerName || 'Walk-in'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium">{PAYMENT_LABELS[sale.paymentMode] ?? sale.paymentMode}</span>
            </div>
          </div>
          <div className="mx-4 border-t" />
          <div className="space-y-1.5 p-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">Items</p>
            {sale.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.itemName}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {formatRupee(item.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 font-medium">{formatRupee(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="mx-4 border-t" />
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{formatRupee(sale.totalAmount)}</span>
          </div>
          <div className="border-t p-4 text-center">
            <p className="text-muted-foreground text-xs">Thank you for your purchase!</p>
            <p className="text-muted-foreground mt-0.5 text-[10px]">Powered by Nexarise</p>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center gap-2 no-print">
        <Button onClick={() => window.print()} variant="default">
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button onClick={onClose} variant="outline">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </div>
    </>
  );
}
