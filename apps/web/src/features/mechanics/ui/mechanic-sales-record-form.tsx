'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mechanicSalesRecordSchema, type MechanicSalesRecordInput } from '@car-spa/domain';
import type { InventoryItem, Mechanic } from '@car-spa/domain';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMechanicSalesRecord } from '@/hooks/use-operations';

type FormValues = MechanicSalesRecordInput;

interface MechanicSalesRecordFormProps {
  mechanic: Mechanic;
  inventory: InventoryItem[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function MechanicSalesRecordForm({
  mechanic,
  inventory,
  onSuccess,
  onCancel,
}: MechanicSalesRecordFormProps) {
  const createRecord = useCreateMechanicSalesRecord();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(mechanicSalesRecordSchema),
    defaultValues: {
      mechanicId: mechanic.id,
      fromDate: '',
      toDate: '',
      items: [{ description: '', quantity: 1 }],
      totalAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createRecord.mutateAsync(data);
    if (result.success) onSuccess();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales record — {mechanic.name}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Record what {mechanic.storeName} sold and the amount generated for the period.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...register('mechanicId')} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From date</Label>
              <Input id="fromDate" type="date" {...register('fromDate')} />
              {errors.fromDate && (
                <p className="text-destructive text-sm">{errors.fromDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To date</Label>
              <Input id="toDate" type="date" {...register('toDate')} />
              {errors.toDate && <p className="text-destructive text-sm">{errors.toDate.message}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Sold items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Item</Label>
                  <select
                    className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                    {...register(`items.${index}.inventoryItemId`)}
                    onChange={(event) => {
                      const item = inventory.find((entry) => entry.id === event.target.value);
                      setValue(`items.${index}.inventoryItemId`, event.target.value);
                      if (item) setValue(`items.${index}.description`, item.name);
                    }}
                  >
                    <option value="">Custom item</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Item description"
                    {...register(`items.${index}.description`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty sold</Label>
                  <Input type="number" min={1} {...register(`items.${index}.quantity`)} />
                </div>
                <div className="flex items-end">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1 })}
            >
              Add item
            </Button>
            {errors.items && (
              <p className="text-destructive text-sm">
                {typeof errors.items.message === 'string'
                  ? errors.items.message
                  : 'Check sold items'}
              </p>
            )}
          </div>

          <div className="space-y-2 md:w-64">
            <Label htmlFor="totalAmount">Total amount generated (₹)</Label>
            <Input id="totalAmount" type="number" step="0.01" {...register('totalAmount')} />
            {errors.totalAmount && (
              <p className="text-destructive text-sm">{errors.totalAmount.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createRecord.isPending}>
              Save record
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
