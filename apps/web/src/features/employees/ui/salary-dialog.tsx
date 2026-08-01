'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { calculateSalary } from '@car-spa/application';
import { salaryRecordSchema } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSalary, useEmployeeLeaveDays } from '../api/use-salary';
import type { EmployeeWithMembership } from '../api/use-employees';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { z } from 'zod';

type SalaryFormData = z.infer<typeof salaryRecordSchema>;

interface SalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeWithMembership[];
  onSuccess?: () => void;
}

export function SalaryDialog({ open, onOpenChange, employees, onSuccess }: SalaryDialogProps) {
  const createSalary = useCreateSalary();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalaryFormData>({
    resolver: zodResolver(salaryRecordSchema),
    defaultValues: {
      employeeId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      fullSalary: 0,
      workingDays: 26,
      leaveDays: 0,
      notes: '',
    },
  });

  const fullSalary = watch('fullSalary');
  const workingDays = watch('workingDays');
  const leaveDays = watch('leaveDays');

  const { data: autoLeaveDays, isFetching: leaveDaysLoading } = useEmployeeLeaveDays(
    selectedEmployeeId,
    selectedMonth,
    selectedYear,
  );

  useEffect(() => {
    if (autoLeaveDays !== undefined) {
      setValue('leaveDays', autoLeaveDays);
    }
  }, [autoLeaveDays, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedEmployeeId('');
    }
  }, [open, reset]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  const preview = useMemo(() => {
    if (!fullSalary || !workingDays) return null;
    try {
      return calculateSalary(Number(fullSalary), Number(workingDays), Number(leaveDays || 0));
    } catch {
      return null;
    }
  }, [fullSalary, workingDays, leaveDays]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createSalary.mutateAsync(data);
    if (!result) return;
    onSuccess?.();
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generate Salary</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salary-employee">Employee</Label>
              <select
                id="salary-employee"
                className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register('employeeId', {
                  onChange: (e) => {
                    const id = e.target.value;
                    setSelectedEmployeeId(id);
                    const emp = employees.find((x) => x.id === id);
                    if (emp?.membership?.salaryAmount != null) {
                      setValue('fullSalary', emp.membership.salaryAmount);
                    }
                    if (emp?.membership?.minWorkDays != null) {
                      setValue('workingDays', emp.membership.minWorkDays);
                    }
                  },
                })}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.displayName}
                  </option>
                ))}
              </select>
              {errors.employeeId && (
                <p className="text-destructive text-sm">{errors.employeeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary-month">Month</Label>
                <Input
                  id="salary-month"
                  type="number"
                  min={1}
                  max={12}
                  {...register('month', {
                    valueAsNumber: true,
                    onChange: (e) => setSelectedMonth(Number(e.target.value)),
                  })}
                />
                {errors.month && (
                  <p className="text-destructive text-sm">{errors.month.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary-year">Year</Label>
                <Input
                  id="salary-year"
                  type="number"
                  min={2020}
                  max={2100}
                  {...register('year', {
                    valueAsNumber: true,
                    onChange: (e) => setSelectedYear(Number(e.target.value)),
                  })}
                />
                {errors.year && (
                  <p className="text-destructive text-sm">{errors.year.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary-full">Full Salary (₹)</Label>
              <Input
                id="salary-full"
                type="number"
                step="0.01"
                {...register('fullSalary', { valueAsNumber: true })}
              />
              {errors.fullSalary && (
                <p className="text-destructive text-sm">{errors.fullSalary.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary-working">Working Days</Label>
                <Input
                  id="salary-working"
                  type="number"
                  {...register('workingDays', { valueAsNumber: true })}
                />
                {errors.workingDays && (
                  <p className="text-destructive text-sm">{errors.workingDays.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="salary-leave">Leave Days</Label>
                  {leaveDaysLoading && (
                    <RefreshCw className="text-muted-foreground h-3 w-3 animate-spin" />
                  )}
                </div>
                <Input
                  id="salary-leave"
                  type="number"
                  step="0.5"
                  {...register('leaveDays', { valueAsNumber: true })}
                />
                {errors.leaveDays && (
                  <p className="text-destructive text-sm">{errors.leaveDays.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary-notes">Notes</Label>
              <textarea
                id="salary-notes"
                rows={2}
                className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register('notes')}
              />
            </div>

            {preview && (
              <div className="bg-muted space-y-1 rounded-md px-4 py-3 text-sm">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                  Preview
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Day Rate</span>
                  <span className="font-medium">₹{preview.perDayRate.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deduction</span>
                  <span className="font-medium text-red-600">
                    -₹{preview.deduction.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Payable Amount</span>
                  <span className="font-bold text-lg">
                    ₹{preview.payableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {createSalary.isError && (
              <p className="text-destructive text-sm">{createSalary.error.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={createSalary.isPending}>
              {createSalary.isPending ? 'Creating…' : 'Generate Salary'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
