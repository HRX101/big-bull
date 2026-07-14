'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { inventoryItemSchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useCreateInventoryItem, useInventory } from '@/hooks/use-operations';

export function InventoryPage() {
  const { data: items = [], isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inventoryItemSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createItem.mutateAsync(data);
    if (result.success) {
      reset();
      setShowForm(false);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock levels, SKUs, and reorder alerts."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add item'}</Button>
        }
      />
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New inventory item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
              {(['sku', 'name', 'category'] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label>{field.toUpperCase()}</Label>
                  <Input {...register(field)} />
                  {errors[field] && (
                    <p className="text-destructive text-sm">{errors[field]?.message as string}</p>
                  )}
                </div>
              ))}
              {(['quantity', 'unitPrice', 'reorderLevel'] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label>{field}</Label>
                  <Input type="number" step="0.01" {...register(field)} />
                </div>
              ))}
              <Button type="submit" disabled={createItem.isPending}>
                Save item
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['SKU', 'Name', 'Qty', 'Price', 'Status']}
        rows={items.map((i) => [
          i.sku,
          i.name,
          String(i.quantity),
          `₹${i.unitPrice.toFixed(2)}`,
          i.quantity <= i.reorderLevel ? (
            <Badge variant="warning">Low stock</Badge>
          ) : (
            <Badge variant="success">OK</Badge>
          ),
        ])}
      />
    </div>
  );
}
