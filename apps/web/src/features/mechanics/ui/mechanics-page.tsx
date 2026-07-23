'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicSchema } from '@car-spa/domain';
import type { Mechanic, PosOrder } from '@car-spa/domain';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MechanicSalesRecordForm } from '@/features/mechanics/ui/mechanic-sales-record-form';
import {
  useCreateMechanic,
  useDeleteMechanic,
  useInventory,
  useMechanicSalesRecords,
  useMechanics,
  usePosOrders,
  useUpdateMechanic,
} from '@/hooks/use-operations';

function summarizeMechanicOrders(mechanicId: string, orders: PosOrder[]) {
  const paidOrders = orders.filter(
    (order) =>
      order.status === 'paid' && order.buyerType === 'mechanic' && order.mechanicId === mechanicId,
  );

  const itemTotals = new Map<string, { description: string; quantity: number }>();
  let totalAmount = 0;

  for (const order of paidOrders) {
    totalAmount += order.total;
    for (const item of order.items) {
      const key = item.inventoryItemId ?? item.description;
      const existing = itemTotals.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        itemTotals.set(key, { description: item.description, quantity: item.quantity });
      }
    }
  }

  return {
    totalAmount,
    items: [...itemTotals.values()],
    orderCount: paidOrders.length,
  };
}

function formatItemsSummary(items: { description: string; quantity: number }[]) {
  if (items.length === 0) return '—';
  return items.map((item) => `${item.description} × ${item.quantity}`).join(', ');
}

export function MechanicsPage() {
  const { data: mechanics = [], isLoading } = useMechanics();
  const { data: orders = [] } = usePosOrders();
  const { data: inventory = [] } = useInventory();
  const { data: salesRecords = [] } = useMechanicSalesRecords();
  const createMechanic = useCreateMechanic();
  const updateMechanic = useUpdateMechanic();
  const deleteMechanic = useDeleteMechanic();

  const [showForm, setShowForm] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [enteringMechanic, setEnteringMechanic] = useState<Mechanic | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(mechanicSchema),
  });

  const summaries = useMemo(
    () =>
      Object.fromEntries(
        mechanics.map((mechanic) => [mechanic.id, summarizeMechanicOrders(mechanic.id, orders)]),
      ),
    [mechanics, orders],
  );

  const openCreateForm = () => {
    setEditingMechanic(null);
    setEnteringMechanic(null);
    reset({ name: '', storeName: '', phone: '', contactName: '' });
    setShowForm(true);
  };

  const openEditForm = (mechanic: Mechanic) => {
    setEnteringMechanic(null);
    setEditingMechanic(mechanic);
    reset({
      name: mechanic.name,
      storeName: mechanic.storeName,
      phone: mechanic.phone,
      contactName: mechanic.contactName ?? '',
    });
    setShowForm(true);
  };

  const onSubmit = handleSubmit(async (data) => {
    setActionError(null);
    const result = editingMechanic
      ? await updateMechanic.mutateAsync({ id: editingMechanic.id, input: data })
      : await createMechanic.mutateAsync(data);

    if (result.success) {
      reset();
      setShowForm(false);
      setEditingMechanic(null);
    } else {
      setActionError(result.error?.message ?? 'Failed to save mechanic');
    }
  });

  const handleDelete = async (mechanic: Mechanic) => {
    setActionError(null);
    const result = await deleteMechanic.mutateAsync(mechanic.id);
    if (!result.success) {
      setActionError(result.error?.message ?? 'Failed to delete mechanic');
    }
  };

  const mechanicRecords = enteringMechanic
    ? salesRecords.filter((record) => record.mechanicId === enteringMechanic.id)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mechanics"
        description="Register mechanic shops, track products sent via POS, and record their sales settlements."
        action={
          <Button
            onClick={() => {
              if (showForm && !editingMechanic) {
                setShowForm(false);
              } else {
                openCreateForm();
              }
            }}
          >
            {showForm && !editingMechanic ? 'Cancel' : 'Add mechanic'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingMechanic ? 'Edit mechanic' : 'New mechanic'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mechanic name</Label>
                <Input {...register('name')} placeholder="Rajesh Kumar" />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Store name</Label>
                <Input {...register('storeName')} placeholder="RK Auto Care" />
                {errors.storeName && (
                  <p className="text-destructive text-sm">{errors.storeName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="9876543210" />
                {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Contact person (optional)</Label>
                <Input {...register('contactName')} placeholder="Owner / manager name" />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button
                  type="submit"
                  disabled={createMechanic.isPending || updateMechanic.isPending}
                >
                  {editingMechanic ? 'Update mechanic' : 'Save mechanic'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMechanic(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {enteringMechanic && (
        <MechanicSalesRecordForm
          mechanic={enteringMechanic}
          inventory={inventory}
          onSuccess={() => setEnteringMechanic(null)}
          onCancel={() => setEnteringMechanic(null)}
        />
      )}

      {enteringMechanic && mechanicRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous sales records</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Period', 'Items sold', 'Total generated', 'Recorded']}
              rows={mechanicRecords.map((record) => [
                `${record.fromDate.toLocaleDateString('en-IN')} – ${record.toDate.toLocaleDateString('en-IN')}`,
                formatItemsSummary(record.items),
                `₹${record.totalAmount.toFixed(2)}`,
                record.createdAt.toLocaleDateString('en-IN'),
              ])}
            />
          </CardContent>
        </Card>
      )}

      {actionError && <p className="text-destructive text-sm">{actionError}</p>}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <DataTable
        headers={['Mechanic', 'Store', 'Items fetched', 'Total sent', 'Orders', 'Actions']}
        rows={mechanics.map((mechanic) => {
          const summary = summaries[mechanic.id] ?? { items: [], totalAmount: 0, orderCount: 0 };
          return [
            <div key={`${mechanic.id}-name`}>
              <p className="font-medium">{mechanic.name}</p>
              <p className="text-muted-foreground text-xs">{mechanic.phone}</p>
            </div>,
            mechanic.storeName,
            formatItemsSummary(summary.items),
            `₹${summary.totalAmount.toFixed(2)}`,
            <Badge key={`${mechanic.id}-orders`} variant="outline">
              {summary.orderCount}
            </Badge>,
            <div key={`${mechanic.id}-actions`} className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openEditForm(mechanic)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(mechanic)}
              >
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingMechanic(null);
                  setEnteringMechanic(mechanic);
                }}
              >
                Enter
              </Button>
            </div>,
          ];
        })}
        emptyMessage="No mechanics registered yet. Add a mechanic shop to sell inventory via POS."
      />
    </div>
  );
}
