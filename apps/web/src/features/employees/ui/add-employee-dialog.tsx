'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateEmployee } from '../api/use-employees';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const addEmployeeSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  salaryAmount: z.number().min(0, 'Salary must be 0 or more').optional(),
  minWorkDays: z
    .number()
    .min(1, 'Minimum work days must be at least 1')
    .max(31, 'Minimum work days cannot exceed 31')
    .optional(),
});

type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) {
  const createEmployee = useCreateEmployee();
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddEmployeeInput>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      email: '',
      displayName: '',
      password: generatePassword(),
      salaryAmount: undefined,
      minWorkDays: undefined,
    },
  });

  useEffect(() => {
    if (!open) reset();
    else setValue('password', generatePassword());
  }, [open, reset, setValue]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (data) => {
    await createEmployee.mutateAsync(data);
    onSuccess?.();
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Employee</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Display Name</Label>
              <Input id="emp-name" {...register('displayName')} />
              {errors.displayName && <p className="text-destructive text-sm">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email</Label>
              <Input id="emp-email" type="email" {...register('email')} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="emp-password">Password</Label>
                <button
                  type="button"
                  className="text-muted-foreground text-xs underline hover:text-foreground"
                  onClick={() => setValue('password', generatePassword())}
                >
                  Generate
                </button>
              </div>
              <Input id="emp-password" type="text" {...register('password')} />
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emp-salary">Salary Amount (₹)</Label>
                <Input
                  id="emp-salary"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="e.g. 15000"
                  {...register('salaryAmount', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                />
                {errors.salaryAmount && (
                  <p className="text-destructive text-sm">{errors.salaryAmount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-min-days">Min Work Days / month</Label>
                <Input
                  id="emp-min-days"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="e.g. 26"
                  {...register('minWorkDays', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                />
                {errors.minWorkDays && (
                  <p className="text-destructive text-sm">{errors.minWorkDays.message}</p>
                )}
              </div>
            </div>
            {createEmployee.isError && (
              <p className="text-destructive text-sm">{createEmployee.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? 'Creating…' : 'Add Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
