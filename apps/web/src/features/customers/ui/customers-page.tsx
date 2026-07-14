'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useCreateCustomer, useCustomers, useDeleteCustomer } from '@/hooks/use-operations';

export function CustomersPage() {
  const { data: customers = [], isLoading, error } = useCustomers();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createCustomer.mutateAsync(data);
    if (result.success) {
      reset();
      setShowForm(false);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage workshop customers and contact details."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Add customer'}
          </Button>
        }
      />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New customer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" {...register('notes')} />
              </div>
              <Button type="submit" disabled={createCustomer.isPending}>Save customer</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {error && <p className="text-destructive text-sm">{error.message}</p>}
      <DataTable
        headers={['Name', 'Phone', 'Email', 'Actions']}
        rows={customers.map((c) => [
          c.name,
          c.phone,
          c.email ?? '—',
          <Button key={c.id} variant="destructive" size="sm" onClick={() => deleteCustomer.mutate(c.id)}>Delete</Button>,
        ])}
      />
    </div>
  );
}
