'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { useCreateEmployee, useEmployees } from '@/hooks/use-operations';

export function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: { status: 'active', hireDate: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createEmployee.mutateAsync(data);
    if (result.success) { reset(); setShowForm(false); }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Workshop staff records." action={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add employee'}</Button>} />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New employee</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input {...register('name')} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
              <div className="space-y-2"><Label>Job title</Label><Input {...register('jobTitle')} /></div>
              <div className="space-y-2"><Label>Hire date</Label><Input type="date" {...register('hireDate')} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {errors.name && <p className="text-destructive text-sm md:col-span-2">{errors.name.message}</p>}
              <Button type="submit" disabled={createEmployee.isPending}>Save employee</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Name', 'Title', 'Phone', 'Status']}
        rows={employees.map((e) => [e.name, e.jobTitle, e.phone, <Badge key={e.id} variant={e.status === 'active' ? 'success' : 'outline'}>{e.status}</Badge>])}
      />
    </div>
  );
}
