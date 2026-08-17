'use client';

import { Printer, X, Hash } from 'lucide-react';
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

function Divider({ char = '-' }: { char?: string }) {
  return <div className="text-[10px] leading-none text-neutral-400">{char.repeat(38)}</div>;
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

  const totalQty = sale.items.reduce((sum, i) => sum + i.quantity, 0);
  const date = new Date(sale.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          html, body { width: 80mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #receipt-print, #receipt-print * { visibility: visible !important; }
          #receipt-print {
            position: fixed;
            top: 0;
            left: 0;
            width: 80mm;
            margin: 0;
            padding: 4mm 3mm;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          #receipt-print * { color: #000 !important; background: transparent !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 p-4 backdrop-blur-sm">
        <div
          id="receipt-print"
          className="w-full max-w-[290px] rounded-sm bg-white px-4 py-4 font-mono text-neutral-900 shadow-2xl shadow-black/40"
        >
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-sm border-2 border-neutral-900 text-[7px] font-black tracking-tight">
              BB
            </div>
            <p className="mt-1.5 text-[13px] font-black tracking-[0.2em] uppercase">
              Big Bull Car Spa
            </p>
            <p className="mt-0.5 text-[9px] tracking-wider text-neutral-500">
              Workshop &amp; Service
            </p>
          </div>

          <div className="my-2">
            <Divider />
          </div>

          {/* Meta */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Receipt No</span>
              <span className="font-semibold">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Date</span>
              <span>{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Customer</span>
              <span className="max-w-[200px] truncate font-semibold">
                {customerName || 'Walk-in'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Payment</span>
              <span className="font-semibold">
                {PAYMENT_LABELS[sale.paymentMode] ?? sale.paymentMode}
              </span>
            </div>
          </div>

          <div className="my-2">
            <Divider />
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
              <span>Item</span>
              <span>Amount</span>
            </div>
            <div className="mt-1 space-y-1.5">
              {sale.items.map((item) => (
                <div key={item.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-semibold">{item.itemName}</span>
                    <span className="flex-1 border-b border-dotted border-neutral-400" />
                    <span className="shrink-0 text-[10px] font-semibold">
                      {formatRupee(item.totalPrice)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-neutral-500">
                    {item.quantity} × {formatRupee(item.unitPrice)}
                  </p>
                  {item.serialNumbers && item.serialNumbers.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {item.serialNumbers.map((sn) => (
                        <span
                          key={sn}
                          className="inline-flex items-center gap-0.5 border border-dotted border-neutral-400 px-1 py-0.5 text-[8px]"
                        >
                          <Hash className="h-2 w-2" />
                          {sn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="my-2">
            <Divider />
          </div>

          {/* Subtotal + Total */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span>{formatRupee(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Items</span>
              <span>{totalQty}</span>
            </div>
          </div>

          <div className="mt-2">
            <Divider char="=" />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] font-black tracking-widest uppercase">Total Paid</span>
            <span className="text-base font-black">{formatRupee(sale.totalAmount)}</span>
          </div>

          <div>
            <Divider char="=" />
          </div>

          {/* Footer */}
          <div className="mt-3 text-center">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase">Thank you!</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">Visit us again</p>
            <p className="mt-2 border-t border-dashed border-neutral-400 pt-1.5 text-[8px] tracking-wider text-neutral-400">
              Big Bull Car Spa · Powered by Nexarise
            </p>
          </div>
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-6 z-50 flex justify-center gap-2">
        <Button
          onClick={() => window.print()}
          className="bg-gradient-to-r from-blue-600 to-sky-500 shadow-lg shadow-blue-900/25 hover:from-blue-700 hover:to-sky-600"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button onClick={onClose} variant="outline" className="bg-background">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </div>
    </>
  );
}
