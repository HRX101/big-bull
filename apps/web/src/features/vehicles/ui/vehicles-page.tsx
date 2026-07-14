'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useCreateVehicle, useCustomers, useVehicles } from '@/hooks/use-operations';

export function VehiclesPage() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: customers = [] } = useCustomers();
  const createVehicle = useCreateVehicle();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
  });

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createVehicle.mutateAsync(data);
    if (result.success) { reset(); setShowForm(false); }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" description="Customer vehicles registered at the workshop." action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add vehicle'}</Button>} />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New vehicle</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-3">
                <Label>Customer</Label>
                <select className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm" {...register('customerId')}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.customerId && <p className="text-destructive text-sm">{errors.customerId.message}</p>}
              </div>
              <div className="space-y-2"><Label>Make</Label><Input {...register('make')} />{errors.make && <p className="text-destructive text-sm">{errors.make.message}</p>}</div>
              <div className="space-y-2"><Label>Model</Label><Input {...register('model')} /></div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" {...register('year')} /></div>
              <div className="space-y-2"><Label>Plate</Label><Input {...register('plateNumber')} /></div>
              <div className="space-y-2"><Label>Color</Label><Input {...register('color')} /></div>
              <div className="space-y-2"><Label>VIN</Label><Input {...register('vin')} /></div>
              <Button type="submit" disabled={createVehicle.isPending}>Save vehicle</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Customer', 'Vehicle', 'Plate', 'Year']}
        rows={vehicles.map((v) => [customerName(v.customerId), `${v.make} ${v.model}`, v.plateNumber, String(v.year)])}
      />
    </div>
  );
}
