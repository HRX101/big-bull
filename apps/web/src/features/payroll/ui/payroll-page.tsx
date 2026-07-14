'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { payrollEntrySchema } from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import {
  useApprovePayrollEntry,
  useCreatePayrollEntry,
  useEmployees,
  usePayrollEntries,
} from '@/hooks/use-operations';

export function PayrollPage() {
  const { data: entries = [], isLoading } = usePayrollEntries();
  const { data: employees = [] } = useEmployees();
  const createEntry = useCreatePayrollEntry();
  const approveEntry = useApprovePayrollEntry();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(payrollEntrySchema),
    defaultValues: {
      periodStart: new Date().toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
    },
  });

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createEntry.mutateAsync(data);
    if (result.success) {
      reset();
      setShowForm(false);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Salary periods, approvals, and payouts."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New entry'}
          </Button>
        }
      />
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New payroll entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee</Label>
                <select
                  className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                  {...register('employeeId')}
                >
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Period start</Label>
                <Input type="date" {...register('periodStart')} />
              </div>
              <div className="space-y-2">
                <Label>Period end</Label>
                <Input type="date" {...register('periodEnd')} />
              </div>
              <div className="space-y-2">
                <Label>Gross pay</Label>
                <Input type="number" step="0.01" {...register('grossPay')} />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input type="number" step="0.01" {...register('deductions')} />
              </div>
              <Button type="submit" disabled={createEntry.isPending}>
                Create draft
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Employee', 'Net pay', 'Status', 'Actions']}
        rows={entries.map((p) => [
          employeeName(p.employeeId),
          `₹${p.netPay.toFixed(2)}`,
          <Badge key={`${p.id}-s`}>{p.status}</Badge>,
          p.status === 'draft' ? (
            <Button key={`${p.id}-a`} size="sm" onClick={() => approveEntry.mutate(p.id)}>
              Approve
            </Button>
          ) : (
            '—'
          ),
        ])}
      />
    </div>
  );
}
