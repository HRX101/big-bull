'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { posOrderSchema } from '@car-spa/domain';
import { receiptService } from '@car-spa/infrastructure';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { useCreatePosOrder, usePayPosOrder, usePosOrders } from '@/hooks/use-operations';

export function PosPage() {
  const { session } = useAuth();
  const { data: orders = [], isLoading } = usePosOrders();
  const createOrder = useCreatePosOrder();
  const payOrder = usePayPosOrder();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(posOrderSchema),
    defaultValues: { items: [{ description: 'Car wash', quantity: 1, unitPrice: 500 }], tax: 0 },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createOrder.mutateAsync(data);
    if (result.success) { reset(); setShowForm(false); }
  });

  const printReceipt = async (orderId: string) => {
    if (!session?.orgId) return;
    const { html } = await receiptService.generateReceipt(orderId, session.orgId);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Point of Sale" description="Create orders, collect payment, and print receipts." action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New order'}</Button>} />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New POS order</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Line item</Label><Input {...register('items.0.description')} /></div>
              <div className="space-y-2"><Label>Quantity</Label><Input type="number" {...register('items.0.quantity')} /></div>
              <div className="space-y-2"><Label>Unit price</Label><Input type="number" step="0.01" {...register('items.0.unitPrice')} /></div>
              <div className="space-y-2"><Label>Tax</Label><Input type="number" step="0.01" {...register('tax')} /></div>
              <Button type="submit" disabled={createOrder.isPending}>Create draft order</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Order', 'Total', 'Status', 'Actions']}
        rows={orders.map((o) => [
          o.id.slice(0, 8),
          `₹${o.total.toFixed(2)}`,
          <Badge key={`${o.id}-s`} variant={o.status === 'paid' ? 'success' : 'outline'}>{o.status}</Badge>,
          <div key={`${o.id}-a`} className="flex gap-2">
            {o.status === 'draft' && <Button size="sm" onClick={() => payOrder.mutate({ orderId: o.id, paymentMethod: 'cash' })}>Mark paid</Button>}
            {o.status === 'paid' && <Button size="sm" variant="outline" onClick={() => printReceipt(o.id)}>Receipt</Button>}
          </div>,
        ])}
      />
    </div>
  );
}
