'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ReceiptText, Search, Printer, Banknote, Wallet, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { useAllSales, useCustomers } from '../api/use-pos';
import { ReceiptModal } from './receipt-modal';
import type { POSSale } from '@car-spa/domain';

const PAGE_SIZE = 10;

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

export function TransactionsPage() {
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const salesQ = useAllSales(orgId);
  const customersQ = useCustomers(orgId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);

  const sales = useMemo(() => salesQ.data ?? [], [salesQ.data]);
  const customers = useMemo(() => customersQ.data ?? [], [customersQ.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const lower = search.toLowerCase();
    return sales.filter(
      (s) =>
        s.receiptNumber.toLowerCase().includes(lower) ||
        s.id.toLowerCase().includes(lower) ||
        (s.customerId ? customers.find((c) => c.id === s.customerId)?.name.toLowerCase().includes(lower) : false),
    );
  }, [sales, search, customers]);

  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const cashTotal = useMemo(() => sales.filter((s) => s.paymentMode === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const upiTotal = useMemo(() => sales.filter((s) => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.totalAmount, 0), [sales]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const customerNameFor = (saleId: string | null) => {
    if (!saleId) return null;
    return customers.find((c) => c.id === saleId)?.name ?? null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete sales history and receipts</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ReceiptText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Transactions</p>
              <p className="text-xl font-bold">{sales.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Revenue</p>
              <p className="text-xl font-bold">{formatRupee(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Banknote className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cash</p>
              <p className="text-xl font-bold">{formatRupee(cashTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">UPI</p>
              <p className="text-xl font-bold">{formatRupee(upiTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by receipt number, transaction ID, or customer…"
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {salesQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No transactions found" description="Completed sales will appear here." />
          ) : (
            <>
              <div className="space-y-2">
                {paged.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{sale.receiptNumber}</span>
                      <span className="text-muted-foreground text-xs">#{sale.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {new Date(sale.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{customerNameFor(sale.customerId) ?? 'Walk-in'}
                      {' · '}{sale.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {PAYMENT_LABELS[sale.paymentMode] ?? sale.paymentMode}
                    </span>
                    <span className="font-bold">{formatRupee(sale.totalAmount)}</span>
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                      aria-label="View receipt"
                      title="View / Print receipt"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <p className="text-muted-foreground text-xs">
                    Page {safePage + 1} of {totalPages} · {filtered.length} transactions
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ReceiptModal
        sale={selectedSale}
        customerName={customerNameFor(selectedSale?.customerId ?? null)}
        onClose={() => setSelectedSale(null)}
      />
    </motion.div>
  );
}
