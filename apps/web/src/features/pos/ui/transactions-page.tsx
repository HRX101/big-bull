'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Search,
  Printer,
  Banknote,
  Wallet,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useAllSales, useCustomers } from '../api/use-pos';
import { ReceiptModal } from './receipt-modal';
import type { POSSale } from '@car-spa/domain';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 5;

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

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <div className="group bg-card relative overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
            iconClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
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
        (s.customerId
          ? customers
              .find((c) => c.id === s.customerId)
              ?.name.toLowerCase()
              .includes(lower)
          : false),
    );
  }, [sales, search, customers]);

  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const cashTotal = useMemo(
    () => sales.filter((s) => s.paymentMode === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0),
    [sales],
  );
  const upiTotal = useMemo(
    () => sales.filter((s) => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.totalAmount, 0),
    [sales],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const customerNameFor = (saleId: string | null) => {
    if (!saleId) return null;
    return customers.find((c) => c.id === saleId)?.name ?? null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        eyebrow="Billing"
        title="Transactions"
        description="Complete sales history and receipts"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Transactions"
          value={String(sales.length)}
          icon={ReceiptText}
          iconClass="bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400"
        />
        <StatCard
          label="Total Revenue"
          value={formatRupee(totalRevenue)}
          icon={TrendingUp}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400"
        />
        <StatCard
          label="Cash"
          value={formatRupee(cashTotal)}
          icon={Banknote}
          iconClass="bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400"
        />
        <StatCard
          label="UPI"
          value={formatRupee(upiTotal)}
          icon={Wallet}
          iconClass="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400"
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by receipt number, transaction ID, or customer…"
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>

          {salesQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description="Completed sales will appear here."
            />
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
                        <span className="text-muted-foreground text-xs">
                          #{sale.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {new Date(sale.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {customerNameFor(sale.customerId) ?? 'Walk-in'}
                        {' · '}
                        {sale.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                        {PAYMENT_LABELS[sale.paymentMode] ?? sale.paymentMode}
                      </span>
                      <span className="font-bold">{formatRupee(sale.totalAmount)}</span>
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
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
