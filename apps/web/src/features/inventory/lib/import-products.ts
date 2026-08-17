import readXlsxFile, { type Row } from 'read-excel-file/browser';
import type { Category, Product, Supplier } from '@car-spa/domain';
import { UNITS } from '@car-spa/shared';
import {
  createCategoryUseCase,
  createProductUseCase,
  createSupplierUseCase,
} from '@car-spa/infrastructure';

export type ImportRowStatus = 'valid' | 'warning' | 'error';

export interface ImportReviewRow {
  rowIndex: number;
  category: string;
  productName: string;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  initialStock: number;
  lowStockThreshold: number;
  supplier: string;
  status: ImportRowStatus;
  messages: string[];
  categoryAction: 'existing' | 'create';
  categoryId?: string;
  supplierAction: 'none' | 'existing' | 'create';
  supplierId?: string;
}

export interface ImportProgressRow extends ImportReviewRow {
  importStatus: 'pending' | 'importing' | 'success' | 'failed';
  errorMessage?: string;
  product?: Product;
}

const EXPECTED_HEADERS = [
  'Category',
  'Product Name',
  'Cost Price',
  'Selling Price',
  'Unit',
  'Initial Stock',
  'Low Stock Threshold',
  'Supplier',
] as const;

const UNIT_ALIASES: Record<string, (typeof UNITS)[number]> = {
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  litre: 'litre',
  liter: 'litre',
  liters: 'litre',
  litres: 'litre',
  l: 'litre',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  box: 'box',
  boxes: 'box',
  pack: 'pack',
  packs: 'pack',
  set: 'set',
  sets: 'set',
  pair: 'pair',
  pairs: 'pair',
  metre: 'metre',
  meter: 'metre',
  meters: 'metre',
  metres: 'metre',
  m: 'metre',
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeUnit(raw: string): (typeof UNITS)[number] | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if ((UNITS as readonly string[]).includes(key)) return key as (typeof UNITS)[number];
  return UNIT_ALIASES[key] ?? null;
}

function parseNumber(raw: string, fallback: number): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function deriveCodePrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const cleaned = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  const base = initials.length >= 2 ? initials : cleaned;
  return (base || 'CAT').slice(0, 5);
}

function getCell(row: Record<string, string>, header: string): string {
  return row[normalizeHeader(header)] ?? '';
}

export async function parseExcelFile(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const sheets = await readXlsxFile(new Blob([buffer]));
  const rows: Row[] = sheets[0]?.data ?? [];
  if (rows.length === 0) throw new Error('Excel file is empty');

  const [headerRow, ...dataRows] = rows;
  if (!headerRow?.length) throw new Error('Excel file is missing a header row');

  const headers = headerRow.map((cell) => normalizeHeader(String(cell ?? '')));
  const missing = EXPECTED_HEADERS.filter((header) => !headers.includes(normalizeHeader(header)));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const normalizedRows = dataRows.map((row: Row) => {
    const normalized: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      if (header) normalized[header] = String(row[index] ?? '').trim();
    });
    return normalized;
  });

  return normalizedRows.filter((row: Record<string, string>) =>
    EXPECTED_HEADERS.some((header) => getCell(row, header).length > 0),
  );
}

export function buildImportReviewRows(
  rows: Record<string, string>[],
  categories: Category[],
  suppliers: Supplier[],
  options: { canViewCost: boolean; canCreateSupplier: boolean },
): ImportReviewRow[] {
  return rows.map((row, index) => {
    const messages: string[] = [];
    let status: ImportRowStatus = 'valid';

    const categoryName = getCell(row, 'Category');
    const productName = getCell(row, 'Product Name');
    const costPriceRaw = getCell(row, 'Cost Price');
    const sellingPriceRaw = getCell(row, 'Selling Price');
    const unitRaw = getCell(row, 'Unit');
    const initialStockRaw = getCell(row, 'Initial Stock');
    const thresholdRaw = getCell(row, 'Low Stock Threshold');
    const supplierName = getCell(row, 'Supplier');

    if (!categoryName) messages.push('Category is required');
    if (!productName) messages.push('Product name is required');

    const sellingPrice = parseNumber(sellingPriceRaw, 0);
    if (sellingPrice === null || sellingPrice <= 0) {
      messages.push('Selling price must be a positive number');
    }

    const costPrice = options.canViewCost ? (parseNumber(costPriceRaw, 0) ?? 0) : 0;
    if (options.canViewCost && costPriceRaw && parseNumber(costPriceRaw, 0) === null) {
      messages.push('Cost price must be a valid number');
    }
    if (
      options.canViewCost &&
      sellingPrice !== null &&
      sellingPrice > 0 &&
      costPrice > sellingPrice
    ) {
      messages.push('Cost price cannot exceed selling price');
    }

    const unit = normalizeUnit(unitRaw);
    if (!unitRaw) messages.push('Unit is required');
    else if (!unit) messages.push(`Unit "${unitRaw}" is not supported`);

    const initialStock = parseNumber(initialStockRaw, 0);
    if (initialStock === null || initialStock < 0) {
      messages.push('Initial stock must be zero or a positive number');
    }

    const lowStockThreshold = parseNumber(thresholdRaw, 5);
    if (lowStockThreshold === null || lowStockThreshold < 0) {
      messages.push('Low stock threshold must be zero or a positive number');
    }

    const matchedCategory = categoryName
      ? categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
      : undefined;
    const categoryAction: ImportReviewRow['categoryAction'] = matchedCategory
      ? 'existing'
      : 'create';

    if (!matchedCategory && categoryName) {
      messages.push(`Category "${categoryName}" will be created`);
      status = 'warning';
    }

    if (matchedCategory) {
      const requiredAttrs = matchedCategory.attributeSchema.filter((a) => a.required);
      if (requiredAttrs.length > 0) {
        messages.push(
          `Category has required attributes (${requiredAttrs.map((a) => a.label).join(', ')}) — values will be empty`,
        );
        status = 'warning';
      }
    }

    let supplierAction: ImportReviewRow['supplierAction'] = 'none';
    let matchedSupplier: Supplier | undefined;
    if (supplierName) {
      matchedSupplier = suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
      if (matchedSupplier) {
        supplierAction = 'existing';
      } else if (options.canCreateSupplier) {
        supplierAction = 'create';
        messages.push(`Supplier "${supplierName}" will be created`);
        if (status === 'valid') status = 'warning';
      } else {
        messages.push(`Supplier "${supplierName}" not found and cannot be created`);
      }
    }

    if (
      messages.some((m) => !m.includes('will be created') && !m.includes('required attributes'))
    ) {
      status = 'error';
    }

    return {
      rowIndex: index + 2,
      category: categoryName,
      productName,
      costPrice: costPrice ?? 0,
      sellingPrice: sellingPrice ?? 0,
      unit: unit ?? unitRaw,
      initialStock: initialStock ?? 0,
      lowStockThreshold: lowStockThreshold ?? 5,
      supplier: supplierName,
      status,
      messages,
      categoryAction,
      categoryId: matchedCategory?.id,
      supplierAction,
      supplierId: matchedSupplier?.id,
    };
  });
}

async function ensureCategory(
  name: string,
  orgId: string,
  userId: string,
  categories: Category[],
  cache: Map<string, Category>,
  existingPrefixes: Set<string>,
): Promise<{ category?: Category; error?: string }> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return { category: cache.get(key)! };

  const existing = categories.find((c) => c.name.toLowerCase() === key);
  if (existing) {
    cache.set(key, existing);
    return { category: existing };
  }

  let prefix = deriveCodePrefix(name);
  for (let attempt = 0; attempt < 10; attempt++) {
    if (existingPrefixes.has(prefix)) {
      prefix = `${deriveCodePrefix(name).slice(0, 3)}${attempt + 1}`.slice(0, 5).toUpperCase();
      continue;
    }

    const result = await createCategoryUseCase.execute(
      {
        name: name.trim(),
        codePrefix: prefix,
        lowStockThresholdDefault: 5,
        hasExpiry: false,
        attributeSchema: [],
      },
      orgId,
      userId,
    );

    if (result.success) {
      const category: Category = {
        id: result.value.id,
        orgId,
        name: name.trim(),
        codePrefix: prefix,
        attributeSchema: [],
        productNames: [],
        lowStockThresholdDefault: 5,
        hasExpiry: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      cache.set(key, category);
      existingPrefixes.add(prefix);
      categories.push(category);
      return { category };
    }

    if (result.error.message.includes('already in use')) {
      existingPrefixes.add(prefix);
      prefix = `${deriveCodePrefix(name).slice(0, 3)}${attempt + 1}`.slice(0, 5).toUpperCase();
      continue;
    }

    return { error: result.error.message };
  }

  return { error: `Could not create category "${name}" — prefix conflict` };
}

async function ensureSupplier(
  name: string,
  orgId: string,
  userId: string,
  suppliers: Supplier[],
  cache: Map<string, Supplier>,
): Promise<{ supplier?: Supplier; error?: string }> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return { supplier: cache.get(key)! };

  const existing = suppliers.find((s) => s.name.toLowerCase() === key);
  if (existing) {
    cache.set(key, existing);
    return { supplier: existing };
  }

  const result = await createSupplierUseCase.execute({ name: name.trim() }, orgId, userId);
  if (!result.success) return { error: result.error.message };

  cache.set(key, result.value);
  suppliers.push(result.value);
  return { supplier: result.value };
}

export async function importProductRows(
  rows: ImportReviewRow[],
  options: {
    orgId: string;
    userId: string;
    canViewCost: boolean;
    canCreateSupplier: boolean;
    categories: Category[];
    suppliers: Supplier[];
    onProgress: (row: ImportProgressRow) => void;
    delayMs?: number;
  },
): Promise<{ imported: Product[]; failed: ImportProgressRow[] }> {
  const categoryCache = new Map<string, Category>();
  const supplierCache = new Map<string, Supplier>();
  const existingPrefixes = new Set(options.categories.map((c) => c.codePrefix));
  const imported: Product[] = [];
  const failed: ImportProgressRow[] = [];
  const categories = [...options.categories];
  const suppliers = [...options.suppliers];

  for (const row of rows) {
    const progressRow: ImportProgressRow = { ...row, importStatus: 'importing' };
    options.onProgress(progressRow);

    if (row.status === 'error') {
      failed.push({
        ...progressRow,
        importStatus: 'failed',
        errorMessage: row.messages.join('; '),
      });
      options.onProgress(failed[failed.length - 1]!);
      continue;
    }

    const unit = normalizeUnit(row.unit);
    if (!unit) {
      failed.push({
        ...progressRow,
        importStatus: 'failed',
        errorMessage: `Invalid unit "${row.unit}"`,
      });
      options.onProgress(failed[failed.length - 1]!);
      continue;
    }

    const { category, error: categoryError } = await ensureCategory(
      row.category,
      options.orgId,
      options.userId,
      categories,
      categoryCache,
      existingPrefixes,
    );
    if (!category || categoryError) {
      failed.push({
        ...progressRow,
        importStatus: 'failed',
        errorMessage: categoryError ?? 'Category could not be resolved',
      });
      options.onProgress(failed[failed.length - 1]!);
      continue;
    }

    let supplierId: string | undefined = row.supplierId;
    if (row.supplierAction === 'create' && row.supplier) {
      const { supplier, error: supplierError } = await ensureSupplier(
        row.supplier,
        options.orgId,
        options.userId,
        suppliers,
        supplierCache,
      );
      if (!supplier || supplierError) {
        failed.push({
          ...progressRow,
          importStatus: 'failed',
          errorMessage: supplierError ?? 'Supplier could not be created',
        });
        options.onProgress(failed[failed.length - 1]!);
        continue;
      }
      supplierId = supplier.id;
    }

    const result = await createProductUseCase.execute(
      {
        categoryId: category.id,
        name: row.productName.trim(),
        attributeValues: {},
        costPrice: options.canViewCost ? row.costPrice : 0,
        sellingPrice: row.sellingPrice,
        unit,
        lowStockThreshold: row.lowStockThreshold,
        initialStock: row.initialStock,
        supplierId: supplierId || undefined,
      },
      options.orgId,
      options.userId,
    );

    if (!result.success) {
      failed.push({
        ...progressRow,
        importStatus: 'failed',
        errorMessage: result.error.message,
      });
      options.onProgress(failed[failed.length - 1]!);
      continue;
    }

    imported.push(result.value);
    options.onProgress({
      ...progressRow,
      importStatus: 'success',
      product: result.value,
    });

    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  return { imported, failed };
}

export function downloadImportTemplate() {
  const csv = `${EXPECTED_HEADERS.map((header) => `"${header}"`).join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inventory-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
