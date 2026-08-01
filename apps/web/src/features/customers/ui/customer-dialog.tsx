'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type Customer, type CustomerInput } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCustomer, useCustomerByPhone } from '../api/use-customers';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/features/authentication/stores/auth-store';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: Customer) => void;
}

export function CustomerDialog({ open, onOpenChange, onSuccess }: CustomerDialogProps) {
  const createCustomer = useCreateCustomer();
  const overlayRef = useRef<HTMLDivElement>(null);
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const autoFilledNameRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
  });

  const phone = watch('phone') ?? '';
  const existingQ = useCustomerByPhone(orgId, phone);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    autoFilledNameRef.current = null;
  }, [open]);

  useEffect(() => {
    const existing = existingQ.data;
    if (!existing) return;
    const currentName = (getValues('name') ?? '').trim();
    const untouched = !currentName || currentName === autoFilledNameRef.current;
    if (untouched) {
      setValue('name', existing.name, { shouldValidate: true });
      setValue('email', existing.email ?? '', { shouldValidate: true });
      setValue('address', existing.address ?? '', { shouldValidate: true });
      autoFilledNameRef.current = existing.name;
    }
  }, [existingQ.data, setValue, getValues]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (data) => {
    const result = await createCustomer.mutateAsync(data);
    if (result.success) onSuccess?.(result.value);
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
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Customer</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
              {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
              {existingQ.isFetching && phone.trim().length >= 10 && (
                <p className="text-muted-foreground text-sm">Looking up phone number…</p>
              )}
              {existingQ.data && (
                <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
                  Existing customer found ({existingQ.data.phone}) — details filled automatically.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" {...register('address')} />
              {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
            </div>
            {createCustomer.isError && (
              <p className="text-destructive text-sm">{createCustomer.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Saving…' : 'Add Customer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
