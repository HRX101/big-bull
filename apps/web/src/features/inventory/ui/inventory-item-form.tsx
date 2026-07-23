'use client';

import type { InventoryCategory, InventoryCategoryField } from '@car-spa/domain';
import { INVENTORY_QUANTITY_UNITS, parseInventoryAttributeValue } from '@car-spa/domain';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/use-operations';

type InventoryItemFormProps = {
  category: InventoryCategory;
  onSuccess?: () => void;
  initialValues?: {
    id: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    reorderLevel: number;
    attributes: Record<string, string | number>;
  };
};

const selectClassName =
  'border-input bg-background h-8 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: InventoryCategoryField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === 'select' || field.type === 'quantity_unit' || field.type === 'boolean') {
    const options =
      field.type === 'quantity_unit'
        ? [...INVENTORY_QUANTITY_UNITS]
        : field.type === 'boolean'
          ? ['Yes', 'No']
          : (field.options ?? []);

    return (
      <select
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <Input
        className="h-8"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    );
  }

  if (field.type === 'cost') {
    return (
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">
          ₹
        </span>
        <Input
          className="h-8 pl-6"
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      </div>
    );
  }

  return (
    <Input
      className="h-8"
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  );
}

export function InventoryItemForm({ category, onSuccess, initialValues }: InventoryItemFormProps) {
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const isEditing = Boolean(initialValues);

  const [sku, setSku] = useState(initialValues?.sku ?? '');
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 0));
  const [unitPrice, setUnitPrice] = useState(String(initialValues?.unitPrice ?? 0));
  const [reorderLevel, setReorderLevel] = useState(String(initialValues?.reorderLevel ?? 5));
  const [attributes, setAttributes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of category.fields) {
      const value = initialValues?.attributes[field.key];
      if (value === undefined) {
        initial[field.key] = '';
        continue;
      }
      if (field.type === 'boolean') {
        const normalized = String(value).toLowerCase();
        initial[field.key] = normalized === 'yes' || normalized === 'true' ? 'Yes' : 'No';
        continue;
      }
      initial[field.key] = String(value);
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  const setAttribute = (key: string, value: string) => {
    setAttributes((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedAttributes = Object.fromEntries(
      category.fields.map((field) => {
        const raw = attributes[field.key] ?? '';
        return [field.key, parseInventoryAttributeValue(field, raw)];
      }),
    );

    const payload = {
      categoryId: category.id,
      sku: sku.trim(),
      attributes: parsedAttributes,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      reorderLevel: Number(reorderLevel),
    };

    const result = isEditing
      ? await updateItem.mutateAsync({ id: initialValues!.id, input: payload })
      : await createItem.mutateAsync(payload);

    if (!result.success) {
      setError(result.error?.message ?? 'Failed to save item');
      return;
    }

    if (!isEditing) {
      setSku('');
      setQuantity('0');
      setUnitPrice('0');
      setReorderLevel('5');
      setAttributes(Object.fromEntries(category.fields.map((field) => [field.key, ''])));
    }
    onSuccess?.();
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium">
            {isEditing ? 'Edit item' : `Add ${category.name} item`}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-2">
            <div className="w-36">
              <Label htmlFor="sku" className="text-xs">
                SKU
              </Label>
              <Input
                id="sku"
                className="mt-1 h-8"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                required
              />
            </div>

            {category.fields.map((field) => (
              <div key={field.key} className="w-40">
                <Label className="text-xs">{field.label}</Label>
                <div className="mt-1">
                  <FieldInput
                    field={field}
                    value={attributes[field.key] ?? ''}
                    onChange={(value) => setAttribute(field.key, value)}
                  />
                </div>
              </div>
            ))}

            <div className="w-24">
              <Label htmlFor="quantity" className="text-xs">
                Qty
              </Label>
              <Input
                id="quantity"
                className="mt-1 h-8"
                type="number"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
            <div className="w-28">
              <Label htmlFor="unitPrice" className="text-xs">
                Price (₹)
              </Label>
              <Input
                id="unitPrice"
                className="mt-1 h-8"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                required
              />
            </div>
            <div className="w-28">
              <Label htmlFor="reorderLevel" className="text-xs">
                Low stock at
              </Label>
              <Input
                id="reorderLevel"
                className="mt-1 h-8"
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(event) => setReorderLevel(event.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button type="submit" size="sm" disabled={isPending}>
            {isEditing ? 'Update item' : 'Save item'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
