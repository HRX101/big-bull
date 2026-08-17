'use client';

import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Search, Plus, Phone, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { useCustomers, useCustomerSearch } from '../api/use-customers';
import { CustomerDialog } from './customer-dialog';
import type { Customer } from '@car-spa/domain';

const PAGE_SIZE = 5;

export function CustomersPage() {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);

  const customersQuery = useCustomers(orgId);
  const searchQuery_ = useCustomerSearch(orgId, searchQuery);
  const isLoading = searchQuery ? searchQuery_.isLoading : customersQuery.isLoading;
  const customers = searchQuery ? (searchQuery_.data ?? []) : (customersQuery.data ?? []);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const paged = customers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearchQuery(value);
    setPage(0);
  }

  function handleDialogSuccess() {
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Customers"
        description="Manage your customers and their visits."
        action={
          <Button
            className="bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-blue-900/25 hover:from-sky-500 hover:to-blue-500"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name or phone…"
          className="pl-10"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            searchQuery ? 'Try a different search term.' : 'Add your first customer to get started.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={i === page ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Card className="hover:border-muted-foreground/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <User className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{customer.name}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3" />
              {customer.phone}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
          <span>{customer.visitCount} visits</span>
          <span>₹{customer.totalSpend.toLocaleString('en-IN')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
