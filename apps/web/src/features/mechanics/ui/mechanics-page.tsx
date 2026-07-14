'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicSchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useCreateMechanic, useEmployees, useMechanics } from '@/hooks/use-operations';

export function MechanicsPage() {
  const { data: mechanics = [], isLoading } = useMechanics();
  const { data: employees = [] } = useEmployees();
  const createMechanic = useCreateMechanic();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(mechanicSchema),
    defaultValues: { isAvailable: true },
  });

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createMechanic.mutateAsync(data);
    if (result.success) { reset(); setShowForm(false); }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mechanics" description="Technician profiles and availability." action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add mechanic'}</Button>} />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New mechanic</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee</Label>
                <select className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm" {...register('employeeId')}>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {errors.employeeId && <p className="text-destructive text-sm">{errors.employeeId.message}</p>}
              </div>
              <div className="space-y-2"><Label>Specializations (comma-separated)</Label><Input {...register('specializations')} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isAvailable')} /> Available</label>
              <Button type="submit" disabled={createMechanic.isPending}>Save mechanic</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Employee', 'Specializations', 'Availability']}
        rows={mechanics.map((m) => [
          employeeName(m.employeeId),
          m.specializations.join(', ') || '—',
          <Badge key={m.id} variant={m.isAvailable ? 'success' : 'outline'}>{m.isAvailable ? 'Available' : 'Busy'}</Badge>,
        ])}
      />
    </div>
  );
}
