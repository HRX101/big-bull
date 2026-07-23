import type { InventoryCategory, InventoryCategoryField } from './entities';
import { INVENTORY_QUANTITY_UNITS } from './entities';

export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function isNumericFieldType(type: InventoryCategoryField['type']): boolean {
  return type === 'number' || type === 'cost';
}

export function validateInventoryAttributes(
  category: InventoryCategory,
  attributes: Record<string, string | number>,
): string | null {
  for (const field of category.fields) {
    const value = attributes[field.key];
    const isEmpty = value === undefined || value === null || value === '';

    if (field.required && isEmpty) {
      return `${field.label} is required`;
    }

    if (isEmpty) continue;

    if (isNumericFieldType(field.type)) {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return `${field.label} must be a number`;
      }
      if (field.type === 'cost' && numeric < 0) {
        return `${field.label} cannot be negative`;
      }
    }

    if (field.type === 'select' && field.options?.length) {
      const normalized = String(value).toLowerCase();
      const allowed = field.options.map((option) => option.toLowerCase());
      if (!allowed.includes(normalized)) {
        return `${field.label} must be one of: ${field.options.join(', ')}`;
      }
    }

    if (field.type === 'quantity_unit') {
      const normalized = String(value).toLowerCase();
      const allowed = INVENTORY_QUANTITY_UNITS.map((unit) => unit.toLowerCase());
      if (!allowed.includes(normalized)) {
        return `${field.label} must be a valid unit`;
      }
    }

    if (field.type === 'boolean') {
      const normalized = String(value).toLowerCase();
      if (!['yes', 'no', 'true', 'false'].includes(normalized)) {
        return `${field.label} must be yes or no`;
      }
    }

    if (field.type === 'date' && Number.isNaN(Date.parse(String(value)))) {
      return `${field.label} must be a valid date`;
    }
  }

  return null;
}

export function formatInventoryAttributeValue(
  field: InventoryCategoryField,
  value: string | number | undefined,
): string {
  if (value === undefined || value === null || value === '') return '—';

  if (field.type === 'cost') {
    const amount = Number(value);
    return Number.isNaN(amount) ? String(value) : `₹${amount.toFixed(2)}`;
  }

  if (field.type === 'boolean') {
    const normalized = String(value).toLowerCase();
    return normalized === 'yes' || normalized === 'true' ? 'Yes' : 'No';
  }

  if (field.type === 'date') {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN');
  }

  if (field.type === 'select') {
    const match = field.options?.find(
      (option) => option.toLowerCase() === String(value).toLowerCase(),
    );
    return match ?? String(value);
  }

  return String(value);
}

export function parseInventoryAttributeValue(
  field: InventoryCategoryField,
  raw: string,
): string | number {
  if (isNumericFieldType(field.type)) {
    return Number(raw);
  }
  if (field.type === 'boolean') {
    return raw.toLowerCase() === 'yes' || raw.toLowerCase() === 'true' ? 'yes' : 'no';
  }
  return raw;
}

export function buildInventoryItemName(
  category: InventoryCategory,
  attributes: Record<string, string | number>,
): string {
  const parts = category.fields
    .slice(0, 3)
    .map((field) => formatInventoryAttributeValue(field, attributes[field.key]))
    .filter((value) => value !== '—');

  if (parts.length > 0) return parts.join(' · ');
  return category.name;
}
