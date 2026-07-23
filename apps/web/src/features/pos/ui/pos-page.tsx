'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PAYMENT_METHOD_LABELS, posOrderSchema } from '@car-spa/domain';
import type { Customer, Mechanic, PosOrder, PosOrderItem } from '@car-spa/domain';
import { receiptService } from '@car-spa/infrastructure';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import {
  useCreatePosOrder,
  useCustomers,
  useInventory,
  useMechanics,
  usePayPosOrder,
  usePosOrders,
} from '@/hooks/use-operations';

function buyerLabel(order: PosOrder, mechanics: Mechanic[], customers: Customer[]): string {
  if (order.buyerType === 'mechanic' && order.mechanicId) {
    const mechanic = mechanics.find((entry) => entry.id === order.mechanicId);
    return mechanic ? `${mechanic.name} (${mechanic.storeName})` : 'Mechanic';
  }
  if (order.buyerType === 'customer' && order.customerId) {
    const customer = customers.find((entry) => entry.id === order.customerId);
    return customer ? customer.name : 'Customer';
  }
  if (order.buyerName || order.buyerContact) {
    return [order.buyerName, order.buyerContact].filter(Boolean).join(' · ');
  }
  return 'Walk-in';
}

function formatItems(items: PosOrderItem[]) {
  return items.map((item) => `${item.description} × ${item.quantity}`).join(', ');
}

export function PosPage() {
  const { session } = useAuth();
  const { data: orders = [], isLoading } = usePosOrders();
  const { data: inventory = [] } = useInventory();
  const { data: mechanics = [] } = useMechanics();
  const { data: customers = [] } = useCustomers();
  const createOrder = useCreatePosOrder();
  const payOrder = usePayPosOrder();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof posOrderSchema>>({
    resolver: zodResolver(posOrderSchema),
    defaultValues: {
      buyerType: 'mechanic',
      items: [{ inventoryItemId: '', description: '', quantity: 1, unitPrice: 0 }],
      tax: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const buyerType = watch('buyerType');
  const watchedItems = watch('items');

  const lineSubtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    [watchedItems],
  );

  const onInventorySelect = (index: number, inventoryItemId: string) => {
    const item = inventory.find((entry) => entry.id === inventoryItemId);
    setValue(`items.${index}.inventoryItemId`, inventoryItemId);
    if (item) {
      setValue(`items.${index}.description`, item.name);
      setValue(`items.${index}.unitPrice`, item.unitPrice);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await createOrder.mutateAsync(data);
    if (result.success) {
      reset({
        buyerType: 'mechanic',
        items: [{ inventoryItemId: '', description: '', quantity: 1, unitPrice: 0 }],
        tax: 0,
      });
      setShowForm(false);
    } else {
      setFormError(result.error?.message ?? 'Failed to create order');
    }
  });

  const printReceipt = async (orderId: string) => {
    if (!session?.orgId) return;
    const { html } = await receiptService.generateReceipt(orderId, session.orgId);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point of Sale"
        description="Sell inventory to registered mechanics or customers. Stock is deducted when payment is collected."
        action={
          <Button onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Cancel' : 'New sale'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New sale</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Sell to</Label>
                  <select
                    className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                    {...register('buyerType')}
                  >
                    <option value="mechanic">Registered mechanic</option>
                    <option value="customer">Registered customer</option>
                    <option value="walk_in">Walk-in (name/contact optional)</option>
                  </select>
                </div>

                {buyerType === 'mechanic' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Mechanic</Label>
                    <select
                      className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                      {...register('mechanicId')}
                    >
                      <option value="">Select mechanic</option>
                      {mechanics.map((mechanic) => (
                        <option key={mechanic.id} value={mechanic.id}>
                          {mechanic.name} — {mechanic.storeName}
                        </option>
                      ))}
                    </select>
                    {errors.mechanicId && (
                      <p className="text-destructive text-sm">{errors.mechanicId.message}</p>
                    )}
                  </div>
                )}

                {buyerType === 'customer' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Customer</Label>
                    <select
                      className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                      {...register('customerId')}
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} — {customer.phone}
                        </option>
                      ))}
                    </select>
                    {errors.customerId && (
                      <p className="text-destructive text-sm">{errors.customerId.message}</p>
                    )}
                  </div>
                )}

                {buyerType === 'walk_in' && (
                  <>
                    <div className="space-y-2">
                      <Label>Name (optional)</Label>
                      <Input {...register('buyerName')} placeholder="Buyer name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact (optional)</Label>
                      <Input {...register('buyerContact')} placeholder="Phone number" />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <Label>Inventory items</Label>
                {fields.map((field, index) => {
                  const selectedId = watchedItems?.[index]?.inventoryItemId;
                  const stock = inventory.find((item) => item.id === selectedId)?.quantity;
                  return (
                    <div key={field.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Item</Label>
                        <select
                          className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                          value={selectedId ?? ''}
                          onChange={(event) => onInventorySelect(index, event.target.value)}
                        >
                          <option value="">Select inventory item</option>
                          {inventory.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} — stock {item.quantity}
                            </option>
                          ))}
                        </select>
                        {stock != null && (
                          <p className="text-muted-foreground text-xs">Available: {stock}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min={1} {...register(`items.${index}.quantity`)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit price (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.unitPrice`)}
                        />
                      </div>
                      <div className="flex items-end">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <input type="hidden" {...register(`items.${index}.description`)} />
                      <input type="hidden" {...register(`items.${index}.inventoryItemId`)} />
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ inventoryItemId: '', description: '', quantity: 1, unitPrice: 0 })
                  }
                >
                  Add line item
                </Button>
                {errors.items && (
                  <p className="text-destructive text-sm">
                    {typeof errors.items.message === 'string'
                      ? errors.items.message
                      : 'Check line items'}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tax (₹)</Label>
                  <Input type="number" step="0.01" {...register('tax')} />
                </div>
                <div className="space-y-1">
                  <Label>Subtotal</Label>
                  <p className="text-lg font-medium">₹{lineSubtotal.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Total</Label>
                  <p className="text-lg font-semibold">
                    ₹{(lineSubtotal + (Number(watch('tax')) || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {formError && <p className="text-destructive text-sm">{formError}</p>}

              <Button type="submit" disabled={createOrder.isPending}>
                Create draft order
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <DataTable
        headers={['Buyer', 'Items', 'Total', 'Status', 'Actions']}
        rows={orders.map((order) => [
          buyerLabel(order, mechanics, customers),
          formatItems(order.items),
          `₹${order.total.toFixed(2)}`,
          <Badge
            key={`${order.id}-status`}
            variant={order.status === 'paid' ? 'success' : 'outline'}
          >
            {order.status}
          </Badge>,
          <div key={`${order.id}-actions`} className="flex flex-wrap gap-2">
            {order.status === 'draft' &&
              (['cash', 'card', 'upi', 'other'] as const).map((method) => (
                <Button
                  key={method}
                  size="sm"
                  variant={method === 'cash' ? 'default' : 'outline'}
                  onClick={() => payOrder.mutate({ orderId: order.id, paymentMethod: method })}
                >
                  Pay {PAYMENT_METHOD_LABELS[method]}
                </Button>
              ))}
            {order.status === 'paid' && (
              <Button size="sm" variant="outline" onClick={() => printReceipt(order.id)}>
                Receipt
              </Button>
            )}
          </div>,
        ])}
        emptyMessage="No sales yet. Create a sale to send inventory to a mechanic or customer."
      />
    </div>
  );
}
