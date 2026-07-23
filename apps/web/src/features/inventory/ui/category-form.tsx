'use client';

import type { InventoryCategory, InventoryCategoryField } from '@car-spa/domain';
import {
  INVENTORY_CATEGORY_FIELD_TYPES,
  INVENTORY_FIELD_TYPE_LABELS,
  slugifyFieldKey,
} from '@car-spa/domain';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInventoryCategory, useUpdateInventoryCategory } from '@/hooks/use-operations';

type DraftField = InventoryCategoryField & { optionsText?: string; isExisting?: boolean };

const EMPTY_FIELD: DraftField = {
  key: '',
  label: '',
  type: 'text',
  required: true,
  optionsText: '',
};

const selectClassName =
  'border-input bg-background h-8 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function toDraftFields(category: InventoryCategory): DraftField[] {
  return category.fields.map((field) => ({
    ...field,
    optionsText: field.options?.join(', ') ?? '',
    isExisting: true,
  }));
}

type CategoryFormProps = {
  category?: InventoryCategory;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const isEditing = Boolean(category);
  const createCategory = useCreateInventoryCategory();
  const updateCategory = useUpdateInventoryCategory();
  const [name, setName] = useState(category?.name ?? '');
  const [fields, setFields] = useState<DraftField[]>(
    category ? toDraftFields(category) : [{ ...EMPTY_FIELD }],
  );
  const [error, setError] = useState<string | null>(null);

  const updateField = (index: number, patch: Partial<DraftField>) => {
    setFields((current) =>
      current.map((field, i) => {
        if (i !== index) return field;
        const next = { ...field, ...patch };
        if (patch.label !== undefined && !field.isExisting) {
          next.key = slugifyFieldKey(patch.label);
        }
        if (patch.type !== undefined && patch.type !== 'select') {
          next.optionsText = '';
        }
        return next;
      }),
    );
  };

  const addField = () => setFields((current) => [...current, { ...EMPTY_FIELD }]);

  const removeField = (index: number) => {
    setFields((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  };

  const buildPayload = () => ({
    name: name.trim(),
    fields: fields.map((field) => ({
      key: field.key || slugifyFieldKey(field.label),
      label: field.label.trim(),
      type: field.type,
      required: field.required,
      ...(field.type === 'select'
        ? {
            options: (field.optionsText ?? '')
              .split(',')
              .map((option) => option.trim())
              .filter(Boolean),
          }
        : {}),
    })),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = buildPayload();
    const result = isEditing
      ? await updateCategory.mutateAsync({ id: category!.id, input: payload })
      : await createCategory.mutateAsync(payload);

    if (!result.success) {
      setError(result.error?.message ?? `Failed to ${isEditing ? 'update' : 'create'} category`);
      return;
    }

    if (!isEditing) {
      setName('');
      setFields([{ ...EMPTY_FIELD }]);
    }
    onSuccess?.();
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-56">
              <Label htmlFor="category-name" className="text-xs">
                Category name
              </Label>
              <Input
                id="category-name"
                className="mt-1 h-8"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Parts, fluids…"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                Add field
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={isPending}>
                {isEditing ? 'Update category' : 'Save category'}
              </Button>
            </div>
          </div>

          <div className="border-border/60 inline-block overflow-hidden rounded-md border text-sm">
            <div className="bg-muted/40 text-muted-foreground grid grid-cols-[180px_128px_48px_40px] items-center gap-2 px-2 py-1.5 text-xs font-medium">
              <span>Field label</span>
              <span>Type</span>
              <span className="text-center">Req.</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <div key={field.key || `new-${index}`} className="border-border/40 border-t">
                <div className="grid grid-cols-[180px_128px_48px_40px] items-center gap-2 px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={field.label}
                    onChange={(event) => updateField(index, { label: event.target.value })}
                    placeholder="e.g. Brand"
                    required
                  />
                  <select
                    className={selectClassName}
                    value={field.type}
                    onChange={(event) =>
                      updateField(index, {
                        type: event.target.value as InventoryCategoryField['type'],
                      })
                    }
                  >
                    {INVENTORY_CATEGORY_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {INVENTORY_FIELD_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) => updateField(index, { required: event.target.checked })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeField(index)}
                    disabled={fields.length === 1}
                  >
                    ×
                  </Button>
                </div>
                {field.type === 'select' && (
                  <div className="border-border/40 flex items-center gap-2 border-t px-2 py-1.5">
                    <span className="text-muted-foreground w-[180px] shrink-0 text-xs">Options</span>
                    <Input
                      className="h-8 w-72"
                      value={field.optionsText ?? ''}
                      onChange={(event) => updateField(index, { optionsText: event.target.value })}
                      placeholder="option 1, option 2"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
