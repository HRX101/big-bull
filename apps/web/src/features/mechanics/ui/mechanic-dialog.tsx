'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicSchema, type Mechanic, type MechanicInput } from '@car-spa/domain';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMechanic, useUpdateMechanic } from '../api/use-mechanics';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MechanicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (mechanic: Mechanic) => void;
  editingMechanic?: Mechanic | null;
}

export function MechanicDialog({
  open,
  onOpenChange,
  onSuccess,
  editingMechanic,
}: MechanicDialogProps) {
  const createMechanic = useCreateMechanic();
  const updateMechanic = useUpdateMechanic();
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MechanicInput>({
    resolver: zodResolver(mechanicSchema),
  });

  useEffect(() => {
    if (!open) {
      reset();
    } else if (editingMechanic) {
      reset({
        name: editingMechanic.name,
        storeName: editingMechanic.storeName,
        phone: editingMechanic.phone ?? '',
        address: editingMechanic.address ?? '',
      });
    } else {
      reset({ name: '', storeName: '', phone: '', address: '' });
    }
  }, [open, editingMechanic, reset]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (data) => {
    if (editingMechanic) {
      await updateMechanic.mutateAsync({
        id: editingMechanic.id,
        data: data as unknown as Record<string, unknown>,
      });
      onSuccess?.(editingMechanic);
    } else {
      const result = await createMechanic.mutateAsync(data);
      if (!result.success) throw new Error(result.error?.message);
      onSuccess?.(result.value!);
    }
    onOpenChange(false);
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editingMechanic ? 'Edit Mechanic' : 'Add Mechanic'}</CardTitle>
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
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" {...register('storeName')} />
              {errors.storeName && (
                <p className="text-destructive text-sm">{errors.storeName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
              {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
              {errors.address && (
                <p className="text-destructive text-sm">{errors.address.message}</p>
              )}
            </div>
            {(createMechanic.isError || updateMechanic.isError) && (
              <p className="text-destructive text-sm">
                {(createMechanic.error ?? updateMechanic.error)?.message}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={createMechanic.isPending || updateMechanic.isPending}
            >
              {createMechanic.isPending || updateMechanic.isPending
                ? 'Saving…'
                : editingMechanic
                  ? 'Update Mechanic'
                  : 'Add Mechanic'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
