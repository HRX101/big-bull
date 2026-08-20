'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Banknote, ArrowRight } from 'lucide-react';
import { supplierRepository, vehicleTaskRepository } from '@car-spa/infrastructure';
import { PROTECTED_ROUTES } from '@car-spa/shared';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';

const fmtCurrency = (n: number) =>
  `₹${Math.max(0, n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function DueOverview() {
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');

  const toBePaidQuery = useQuery({
    queryKey: ['quick-to-be-paid', orgId],
    queryFn: async () => {
      const suppliers = await supplierRepository.findByOrgId(orgId, { limit: 500 });
      return suppliers.reduce((sum, s) => {
        const derived = s.totalAmount - s.advanceAmount;
        return sum + (s.toBePaid != null && s.toBePaid !== 0 ? s.toBePaid : derived);
      }, 0);
    },
    enabled: !!orgId,
  });

  const toGetQuery = useQuery({
    queryKey: ['quick-to-get', orgId],
    queryFn: async () => {
      const tasks = await vehicleTaskRepository.findByOrgId(orgId, { limit: 500 });
      return tasks.reduce((sum, t) => sum + (t.dueAmount > 0 ? t.dueAmount : 0), 0);
    },
    enabled: !!orgId,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DueCard
        href={PROTECTED_ROUTES.suppliers}
        icon={HandCoins}
        tone="bg-amber-500/15 text-amber-600"
        label="To Be Paid"
        sublabel="Suppliers"
        value={fmtCurrency(toBePaidQuery.data ?? 0)}
        loading={toBePaidQuery.isLoading}
      />
      <DueCard
        href={PROTECTED_ROUTES.vehicleTasks}
        icon={Banknote}
        tone="bg-rose-500/15 text-rose-600"
        label="To Get"
        sublabel="Vehicle task dues"
        value={fmtCurrency(toGetQuery.data ?? 0)}
        loading={toGetQuery.isLoading}
      />
    </div>
  );
}

function DueCard({
  href,
  icon: Icon,
  tone,
  label,
  sublabel,
  value,
  loading,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  sublabel: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:border-primary/50 group flex items-center gap-4 rounded-2xl border p-5 shadow-sm shadow-black/5 transition-colors"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
          {label} · {sublabel}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        )}
      </div>
      <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-colors" />
    </Link>
  );
}