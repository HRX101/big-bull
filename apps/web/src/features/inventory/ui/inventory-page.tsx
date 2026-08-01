'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '@car-spa/infrastructure';
import {
  Box, Package, TrendingUp, AlertTriangle, Plus, X, Edit, Trash2, Search,
  Copy, Eye, Archive, ArrowUpDown, ChevronLeft, ChevronRight, ArchiveRestore,
} from 'lucide-react';
import { type Category, type Product, type Supplier, type StockMovement, type SerializedItem, type AttributeDefinition } from '@car-spa/domain';
import { UNITS, hasPermission } from '@car-spa/shared';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory, useHardDeleteCategory,
  useProducts, useProductSearch, useCreateProduct, useUpdateProduct, useArchiveProduct, useHardDeleteProduct,
  useArchivedProducts, useUnarchiveProduct,
  useArchivedCategories, useUnarchiveCategory,
  useArchivedSuppliers, useUnarchiveSupplier,
  useStockMovements, useRecordStockMovement, useRestockSerializedItems,
  useSuppliers, useCreateSupplier, useHardDeleteSupplier, useSupplierByPhone,
  useSerializedItems, useAvailableSerializedItems, useCreateSerializedItems, useRemoveSerializedItems,
} from '../api/use-inventory';

type Tab = 'categories' | 'products' | 'inventory' | 'adjustout' | 'archived';
type ArchivedSubTab = 'products' | 'categories' | 'suppliers';
type SortField = 'name' | 'sku' | 'currentStock' | 'sellingPrice' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

/* ────── Helpers ────── */

function generateSerialNumbers(sku: string, existing: string[], count: number): string[] {
  let maxIndex = 0;
  for (const s of existing) {
    const m = s.match(/-(\d+)$/);
    if (m && m[1]) maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
  }
  const out: string[] = [];
  for (let i = 1; i <= count; i++) out.push(`${sku}-${maxIndex + i}`);
  return out;
}

function fmt(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n); }
function timeAgo(d: Date) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24); if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ────── Main Page ────── */

export function InventoryPage() {
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const role = useAuthStore((s) => s.session?.role ?? 'employee');
  const canViewCost = hasPermission(role, 'inventory:viewCost');

  const [tab, setTab] = useState<Tab>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const categoriesQ = useCategories(orgId);
  const productsQ = useProducts(orgId);
  const suppliersQ = useSuppliers(orgId);
  const archivedProductsQ = useArchivedProducts(orgId);
  const archivedCategoriesQ = useArchivedCategories(orgId);
  const archivedSuppliersQ = useArchivedSuppliers(orgId);
  const { query: searchQuery, setSearch, results: searchResults, isSearching } = useProductSearch(orgId);
  const productData = isSearching ? (searchResults.data ?? []) : (productsQ.data ?? []);

  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const products = useMemo(() => prodFilter(productData, selectedCatId), [productData, selectedCatId]);
  const suppliers = useMemo(() => suppliersQ.data ?? [], [suppliersQ.data]);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'sku') cmp = a.sku.localeCompare(b.sku);
      else if (sortField === 'currentStock') cmp = a.currentStock - b.currentStock;
      else if (sortField === 'sellingPrice') cmp = a.sellingPrice - b.sellingPrice;
      else if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [products, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!orgId) return <Skeleton className="h-96 w-full" />;

  const tabs: { key: Tab; label: string; icon: typeof Box }[] = [
    { key: 'categories', label: 'Categories', icon: Box },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'inventory', label: 'Inventory', icon: TrendingUp },
    { key: 'adjustout', label: 'Adjust Out', icon: ArrowUpDown },
    { key: 'archived', label: 'Archived', icon: Archive },
  ];

  return (
    <div className="space-y-6 p-0 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-display text-3xl tracking-tight">Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage products, stock, and suppliers</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'products' && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or category..."
                  value={searchQuery}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9"
                  aria-label="Search products"
                />
              </div>
            )}
            {tab === 'categories' && <CreateCategoryDialog />}
            {tab === 'products' && <CreateProductDialog categories={categories} suppliers={suppliers} canViewCost={canViewCost} />}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1" role="tablist" aria-label="Inventory sections">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => { setTab(t.key); setSelectedCatId(null); setSelectedProductId(null); setPage(1); }}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          {tab === 'products' && (
            <div className="flex flex-wrap items-center gap-1">
              <SortButton field="name" label="Name" current={sortField} dir={sortDir} onClick={toggleSort} />
              <SortButton field="sku" label="SKU" current={sortField} dir={sortDir} onClick={toggleSort} />
              <SortButton field="currentStock" label="Stock" current={sortField} dir={sortDir} onClick={toggleSort} />
              <SortButton field="sellingPrice" label="Price" current={sortField} dir={sortDir} onClick={toggleSort} />
            </div>
          )}
        </div>

        <div className="mt-6">
          {tab === 'categories' && (
            <CategoriesView
              categories={categories}
              isLoading={categoriesQ.isLoading}
              error={categoriesQ.error}
              onRefetch={() => categoriesQ.refetch()}
            />
          )}
          {tab === 'products' && (
            <ProductsView
              products={paginated}
              total={sorted.length}
              page={page}
              totalPages={totalPages}
              onPageChange={(p: number) => setPage(p)}
              categories={categories}
              suppliers={suppliers}
              selectedCatId={selectedCatId}
              onSelectCategory={setSelectedCatId}
              onSelectProduct={setSelectedProductId}
              isLoading={productsQ.isLoading || searchResults.isLoading}
              error={productsQ.error || searchResults.error}
              onRefetch={() => { productsQ.refetch(); searchResults.refetch(); }}
              canViewCost={canViewCost}
            />
          )}
          {tab === 'inventory' && (
            <StockLedgerView
              products={productData}
              categories={categories}
              selectedProductId={selectedProductId}
              onSelectProduct={setSelectedProductId}
            />
          )}
          {tab === 'adjustout' && (
            <AdjustOutView
              products={productData}
              selectedProductId={selectedProductId}
              onSelectProduct={setSelectedProductId}
            />
          )}
          {tab === 'archived' && (
            <ArchivedView
              products={archivedProductsQ.data ?? []}
              categories={archivedCategoriesQ.data ?? []}
              suppliers={archivedSuppliersQ.data ?? []}
              isLoading={archivedProductsQ.isLoading || archivedCategoriesQ.isLoading || archivedSuppliersQ.isLoading}
              error={archivedProductsQ.error ?? archivedCategoriesQ.error ?? archivedSuppliersQ.error}
              onRefetch={() => { archivedProductsQ.refetch(); archivedCategoriesQ.refetch(); archivedSuppliersQ.refetch(); }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function prodFilter(products: Product[], catId: string | null) {
  if (!catId) return products;
  return products.filter(p => p.categoryId === catId);
}

function SortButton({ field, label, current, dir, onClick }: { field: SortField; label: string; current: SortField; dir: SortDir; onClick: (f: SortField) => void }) {
  const active = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-label={`Sort by ${label} ${active ? `(${dir === 'asc' ? 'ascending' : 'descending'})` : ''}`}
    >
      {label}
      {active && <ArrowUpDown className={`h-3 w-3 transition-transform ${dir === 'desc' ? 'rotate-180' : ''}`} />}
    </button>
  );
}

/* ────── CATEGORIES ────── */

function CategoriesView({ categories, isLoading, error, onRefetch }: { categories: Category[]; isLoading: boolean; error: Error | null; onRefetch: () => void }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const total = categories.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = categories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-20 mt-1" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /></CardContent></Card>)}
  </div>;

  if (error) return <div className="flex flex-col items-center gap-3 py-16"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-muted-foreground">Failed to load categories.</p><Button variant="outline" size="sm" onClick={onRefetch}>Retry</Button></div>;

  if (categories.length === 0) return <EmptyState title="No categories yet" description="Categories help you organize products by type (e.g. Tyres, Engine Oil, Batteries)." action={<CreateCategoryDialog />} />;

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{total} categor{'y'}{total === 1 ? '' : 'ies'}</p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {paginated.map(cat => <CategoryCard key={cat.id} category={cat} />)}
    </div>
    {totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-sm text-muted-foreground">{safePage} / {totalPages}</span>
      <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
    </div>}
  </div>;
}

function CategoryCard({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [threshold, setThreshold] = useState(category.lowStockThresholdDefault);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'archive' | 'delete'>('archive');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const archiveCat = useArchiveCategory();
  const deleteCat = useHardDeleteCategory();
  const updateCat = useUpdateCategory();

  const requestArchive = () => {
    setConfirmType('archive');
    setConfirmAction(() => () => archiveCat.mutateAsync(category.id));
    setConfirmOpen(true);
  };

  const requestDelete = () => {
    setConfirmType('delete');
    setConfirmAction(() => () => deleteCat.mutateAsync(category.id));
    setConfirmOpen(true);
  };

  const handleSaveEdit = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    updateCat.mutateAsync({ id: category.id, data: { name, lowStockThresholdDefault: threshold } });
    setEditing(false);
  };

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{category.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Prefix: <span className="font-mono">{category.codePrefix}</span></p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(!editing)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted" aria-label="Edit category"><Edit className="h-4 w-4" /></button>
            <button onClick={requestArchive} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted" aria-label="Archive category"><Archive className="h-4 w-4" /></button>
            <button onClick={requestDelete} className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10" aria-label="Delete category"><Trash2 className="h-4 w-4" /></button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {editing ? (
            <div className="space-y-3">
              <div><Label htmlFor="cat-name-edit">Name</Label><Input id="cat-name-edit" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label htmlFor="cat-threshold-edit">Low Stock Threshold</Label><Input id="cat-threshold-edit" type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={updateCat.isPending}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="bg-muted px-2 py-0.5 rounded text-xs">Threshold: {category.lowStockThresholdDefault}</span>
                <span className="bg-muted px-2 py-0.5 rounded text-xs">Expiry: {category.hasExpiry ? 'Yes' : 'No'}</span>
                <span className="bg-muted px-2 py-0.5 rounded text-xs">Attributes: {category.attributeSchema.length}</span>
              </div>
              {category.attributeSchema.length > 0 && (
                <div className="space-y-1 mt-2">
                  {category.attributeSchema.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                      <span className="font-medium">{a.label}</span>
                      <span className="text-muted-foreground">({a.type})</span>
                      {a.required && <Badge variant="destructive" className="text-[10px] px-1 py-0">required</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`cat-${category.id}-${confirmType}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmAction}
        title={confirmType === 'archive' ? 'Archive Category' : 'Delete Category'}
        description={confirmType === 'archive'
          ? `Are you sure you want to archive "${category.name}"? It will be hidden from products view.`
          : `Permanently delete "${category.name}"? This removes the category and all its products and serialized items.`}
        variant={confirmType === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmType === 'archive' ? 'Archive' : 'Delete'}
        loading={archiveCat.isPending || deleteCat.isPending}
      />
    </>
  );
}

function CreateCategoryDialog() {
  const createCat = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [dirty, setDirty] = useState(false);

  const addAttr = () => {
    setAttributes([...attributes, { key: '', label: '', type: 'text', required: false }]);
    setDirty(true);
  };
  const removeAttr = (i: number) => { setAttributes(attributes.filter((_, idx) => idx !== i)); setDirty(true); };

  const updateAttr = (i: number, field: keyof AttributeDefinition, value: string | boolean) => {
    const updated = [...attributes];
    const a = { ...attributes[i]! };
    if (field === 'label') { a.label = value as string; a.key = (value as string).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''); }
    else if (field === 'type') a.type = value as 'text' | 'number' | 'select';
    else if (field === 'required') a.required = value as boolean;
    else if (field === 'options') a.options = (value as string).split(',').map(s => s.trim()).filter(Boolean);
    updated[i] = a; setAttributes(updated); setDirty(true);
  };

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Category name is required');
    if (codePrefix.length < 2 || codePrefix.length > 5) errors.push('Prefix must be 2-5 uppercase letters');
    else if (!/^[A-Z]+$/.test(codePrefix)) errors.push('Use uppercase letters only');
    const seen = new Set<string>();
    for (const a of attributes) {
      if (!a.key) errors.push('Attribute key is required');
      else if (seen.has(a.key)) errors.push(`Duplicate attribute key: "${a.key}"`);
      else seen.add(a.key);
      if (a.type === 'select' && (!a.options || a.options.length === 0)) errors.push(`"${a.label || a.key}" select must have options`);
    }
    return errors;
  }, [name, codePrefix, attributes]);
  const canSubmit = validation.length === 0 && name.trim() && codePrefix.length >= 2;

  const handleSubmit = async () => {
    const result = await createCat.mutateAsync({
      name: name.trim(), codePrefix, lowStockThresholdDefault: threshold, hasExpiry,
      attributeSchema: attributes.map(a => ({ ...a, options: a.type === 'select' ? a.options : undefined })),
    });
    if (!result.success) return;
    setOpen(false); setName(''); setCodePrefix(''); setThreshold(5); setHasExpiry(false); setAttributes([]); setDirty(false);
  };

  const handleClose = () => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return;
    setOpen(false);
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Category</Button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="create-cat-title">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 id="create-cat-title" className="text-lg font-semibold">Create Category</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Category Name" required tooltip="Display name for this product category" id="cat-name">
            <Input id="cat-name" value={name} onChange={e => { setName(e.target.value); setDirty(true); }} placeholder="e.g. Tyre, Engine Oil" />
          </Field>
          <Field label="Code Prefix" required tooltip="2-5 uppercase letters used for auto-generating SKUs (e.g. TYR)" id="cat-prefix">
            <Input id="cat-prefix" value={codePrefix} onChange={e => { setCodePrefix(e.target.value.toUpperCase().slice(0, 5)); setDirty(true); }} placeholder="e.g. TYR, ENG, BAT" maxLength={5} />
            {validation.some(v => v.includes('Prefix')) && <p className="text-destructive text-xs mt-1">{validation.find(v => v.includes('Prefix'))}</p>}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default Low Stock Threshold" tooltip="Products in this category will alert when stock falls below this number" id="cat-threshold">
              <Input id="cat-threshold" type="number" min={0} value={threshold} onChange={e => { setThreshold(Number(e.target.value)); setDirty(true); }} />
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasExpiry} onChange={e => { setHasExpiry(e.target.checked); setDirty(true); }} className="rounded" />
                Has expiry dates
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom Attributes <span className="text-muted-foreground font-normal text-xs">(for product forms)</span></Label>
              <Button type="button" variant="outline" size="sm" onClick={addAttr}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {attributes.map((attr, i) => (
              <div key={i} className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2 items-start">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Label (e.g. Size)"
                        value={attr.label}
                        onChange={e => updateAttr(i, 'label', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Key: <span className="font-mono">{attr.key || '-'}</span></span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <select value={attr.type} onChange={e => updateAttr(i, 'type', e.target.value)} className="h-8 text-sm rounded border bg-background px-2" aria-label="Attribute type">
                        <option value="text">Text</option><option value="number">Number</option><option value="select">Select</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-1 text-xs mt-1.5 shrink-0">
                      <input type="checkbox" checked={attr.required} onChange={e => updateAttr(i, 'required', e.target.checked)} />
                      Required
                    </label>
                    <button onClick={() => removeAttr(i)} className="text-destructive mt-1.5 p-1 rounded hover:bg-destructive/10" aria-label="Remove attribute"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {attr.type === 'select' && (
                    <Input
                      placeholder="Options (comma-separated)"
                      value={(attr.options ?? []).join(', ')}
                      onChange={e => updateAttr(i, 'options', e.target.value)}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>
            ))}
            {validation.some(v => v.includes('Duplicate')) && <p className="text-destructive text-xs">{validation.find(v => v.includes('Duplicate'))}</p>}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || createCat.isPending}>
            {createCat.isPending ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────── PRODUCTS ────── */

function ProductsView({
  products, total, page, totalPages, onPageChange,
  categories, suppliers, selectedCatId, onSelectCategory, onSelectProduct: _onSelectProduct,
  isLoading, error, onRefetch, canViewCost,
}: {
  products: Product[]; total: number; page: number; totalPages: number; onPageChange: (p: number) => void;
  categories: Category[]; suppliers: Supplier[]; selectedCatId: string | null;
  onSelectCategory: (id: string | null) => void; onSelectProduct: (id: string | null) => void;
  isLoading: boolean; error: Error | null; onRefetch: () => void; canViewCost: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Filter by Category</h3>
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!selectedCatId ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
        >
          All Products
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCatId === cat.id ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
          >
            {cat.name}
            <span className="text-xs ml-1 opacity-70">({cat.codePrefix})</span>
          </button>
        ))}
      </div>
      <div className="lg:col-span-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardContent></Card>)}</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-muted-foreground">Failed to load products.</p><Button variant="outline" size="sm" onClick={onRefetch}>Retry</Button></div>
        ) : products.length === 0 ? (
          <EmptyState title="No products found" description={selectedCatId ? 'This category has no products yet.' : 'Try adjusting your search or filters.'} action={!selectedCatId ? <CreateProductDialog categories={categories} suppliers={suppliers} canViewCost={canViewCost} /> : undefined} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{total} product{total !== 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {products.map(product => (
                <ProductCard key={product.id} product={product} categories={categories} suppliers={suppliers} canViewCost={canViewCost} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, categories, suppliers, canViewCost }: { product: Product; categories: Category[]; suppliers: Supplier[]; canViewCost: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useHardDeleteProduct();
  const [expanded, setExpanded] = useState(false);

  const category = categories.find(c => c.id === product.categoryId);
  const isLowStock = product.currentStock <= product.lowStockThreshold;
  const isOutOfStock = product.currentStock === 0;

  const copySku = () => { navigator.clipboard.writeText(product.sku); toast.success('SKU copied'); };
  const copyId = () => { navigator.clipboard.writeText(product.id); toast.success('Product ID copied'); };

  return (
    <>
      <Card className={`relative transition-colors ${isOutOfStock ? 'border-destructive/30' : isLowStock ? 'border-amber-300 dark:border-amber-800' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={copySku} className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors flex items-center gap-1" title="Copy SKU">
                  {product.sku} <Copy className="h-3 w-3" />
                </button>
                <h3 className="font-semibold truncate">{product.name}</h3>
                {isOutOfStock && <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>}
                {isLowStock && !isOutOfStock && <Badge variant="warning" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Low Stock</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                <span className="text-muted-foreground">{category?.name ?? '-'}</span>
                <span>Stock: <strong className={isLowStock ? 'text-destructive' : ''}>{product.currentStock}</strong></span>
                <span>Unit: {product.unit}</span>
                <span>Selling: <strong>{fmt(product.sellingPrice)}</strong></span>
                {canViewCost && <span>Cost: <strong>{fmt(product.costPrice)}</strong></span>}
                {product.expiryDate && (
                  <span className={`text-xs ${new Date(product.expiryDate) < new Date() ? 'text-destructive' : 'text-amber-600'}`}>
                    Exp: {new Date(product.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo(product.createdAt)}</span>
              </div>
              {category && category.attributeSchema.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {category.attributeSchema.map(attr => {
                    const val = product.attributeValues[attr.key];
                    return val !== undefined && val !== '' ? (
                      <span key={attr.key} className="text-[11px] bg-muted/70 px-2 py-0.5 rounded">{String(attr.label)}: <span className="font-medium">{String(val)}</span></span>
                    ) : null;
                  })}
                </div>
              )}
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                  {product.notes && <p>Notes: {product.notes}</p>}
                  {product.supplierId && <p>Supplier ID: {product.supplierId}</p>}
                  <p>Created: {new Date(product.createdAt).toLocaleString('en-IN')}</p>
                  <p>Updated: {new Date(product.updatedAt).toLocaleString('en-IN')}</p>
                  <button onClick={copyId} className="text-primary hover:underline flex items-center gap-1"><Copy className="h-3 w-3" /> Copy Product ID</button>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditOpen(true)} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted" aria-label="Edit product"><Edit className="h-4 w-4" /></button>
              <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted" aria-label="Details"><Eye className="h-4 w-4" /></button>
              <button onClick={() => { setConfirmArchive(true); setConfirmOpen(true); }} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted" aria-label="Archive product"><Archive className="h-4 w-4" /></button>
              <button onClick={() => { setConfirmArchive(false); setConfirmOpen(true); }} className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10" aria-label="Delete product"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`${product.id}-${confirmArchive ? 'archive' : 'delete'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => { if (confirmArchive) await archiveProduct.mutateAsync(product.id); else await deleteProduct.mutateAsync(product.id); }}
        title={confirmArchive ? 'Archive Product' : 'Delete Product'}
        description={confirmArchive ? `Archive "${product.name}" (${product.sku})? It will be hidden from lists.` : `Permanently delete "${product.name}" (${product.sku})? This removes the product and all its serialized items.`}
        variant={confirmArchive ? 'warning' : 'destructive'}
        confirmLabel={confirmArchive ? 'Archive' : 'Delete'}
        loading={archiveProduct.isPending || deleteProduct.isPending}
      />
      {editOpen && <EditProductDialog product={product} categories={categories} suppliers={suppliers} canViewCost={canViewCost} onOpenChange={setEditOpen} />}
    </>
  );
}

function ProductNameSelector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [pickingNew, setPickingNew] = useState(false);
  const isCustom = value !== '' && !options.includes(value);
  const showInput = pickingNew || isCustom;

  return (
    <div className="space-y-2">
      <select
        value={showInput ? '__new__' : value}
        onChange={e => {
          if (e.target.value === '__new__') { setPickingNew(true); onChange(''); }
          else { setPickingNew(false); onChange(e.target.value); }
        }}
        className="w-full h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="" disabled>Select a name...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__new__">New…</option>
      </select>
      {showInput && (
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Type a new product name..." />
      )}
    </div>
  );
}

function CreateProductDialog({ categories, suppliers, canViewCost }: { categories: Category[]; suppliers: Supplier[]; canViewCost: boolean }) {
  const createProduct = useCreateProduct();
  const addSupplier = useCreateSupplier();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState('');
  const [name, setName] = useState('');
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('piece');
  const [threshold, setThreshold] = useState('5');
  const [supplierId, setSupplierId] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [dirty, setDirty] = useState(false);

  const authOrgId = useAuthStore((s) => s.session?.orgId ?? '');
  const newSupplierLookup = useSupplierByPhone(authOrgId, newSupplierPhone);

  useEffect(() => {
    const existing = newSupplierLookup.data;
    if (existing && !newSupplierName.trim()) setNewSupplierName(existing.name);
  }, [newSupplierLookup.data, newSupplierName]);

  const category = useMemo(() => categories.find(c => c.id === catId), [catId, categories]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!catId) errors.push('Category is required');
    if (!name.trim()) errors.push('Product name is required');
    const sp = Number(sellingPrice);
    if (sp <= 0) errors.push('Selling price must be positive');
    if (!unit) errors.push('Unit is required');
    if (category?.hasExpiry && !expiryDate) errors.push('Expiry date is required for this category');
    if (category) {
      for (const attr of category.attributeSchema) {
        if (attr.required && (!attrs[attr.key] || attrs[attr.key] === '')) errors.push(`"${attr.label}" is required`);
        if (attr.type === 'number' && attrs[attr.key] && isNaN(Number(attrs[attr.key]))) errors.push(`"${attr.label}" must be a number`);
      }
    }
    return errors;
  }, [catId, name, sellingPrice, unit, expiryDate, category, attrs]);
  const canSubmit = validation.length === 0 && catId && name.trim();

  const handleSubmit = async () => {
    const attributeValues: Record<string, unknown> = {};
    for (const key of Object.keys(attrs)) { attributeValues[key] = attrs[key]; }
    const result = await createProduct.mutateAsync({
      categoryId: catId, name: name.trim(), attributeValues,
      costPrice: canViewCost ? Number(costPrice) || 0 : 0, sellingPrice: Number(sellingPrice), unit, lowStockThreshold: Number(threshold) || 5,
      supplierId: supplierId || undefined,
      expiryDate: expiryDate || undefined,
    });
    if (!result.success) return;
    const trimmedName = name.trim();
    if (trimmedName && category && !(category.productNames ?? []).includes(trimmedName)) {
      try {
        await categoryRepository.update(catId, { productNames: [...(category.productNames ?? []), trimmedName] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch { /* best effort */ }
    }
    setOpen(false); setCatId(''); setName(''); setAttrs({}); setCostPrice(''); setSellingPrice('');
    setUnit('piece'); setThreshold('5'); setSupplierId(''); setShowAddSupplier(false); setNewSupplierName(''); setNewSupplierPhone(''); setExpiryDate(''); setDirty(false);
  };

  const handleClose = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    setOpen(false);
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="create-prod-title">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 id="create-prod-title" className="text-lg font-semibold">Add Product</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Category" required tooltip="Every product must belong to a category for SKU generation and organization" id="prod-cat">
            <select id="prod-cat" value={catId} onChange={e => { setCatId(e.target.value); setAttrs({}); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.codePrefix})</option>)}
            </select>
          </Field>
          <Field label="Product Name" required tooltip="Pick a predefined name or choose New to add one" id="prod-name">
            <ProductNameSelector options={category?.productNames ?? []} value={name} onChange={v => { setName(v); setDirty(true); }} />
          </Field>
          {category && category.attributeSchema.map(attr => (
            <Field key={attr.key} label={attr.label} required={attr.required} tooltip={`Custom attribute defined by the "${category.name}" category`} id={`attr-${attr.key}`}>
              {attr.type === 'select' ? (
                <select value={attrs[attr.key] ?? ''} onChange={e => { setAttrs({ ...attrs, [attr.key]: e.target.value }); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Select...</option>
                  {(attr.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input type={attr.type === 'number' ? 'number' : 'text'} value={attrs[attr.key] ?? ''} onChange={e => { setAttrs({ ...attrs, [attr.key]: e.target.value }); setDirty(true); }} placeholder={attr.label} />
              )}
            </Field>
          ))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {canViewCost && (
              <Field label="Cost Price" tooltip="Purchase cost per unit. Only owners can view or set this." id="prod-cost">
                <Input id="prod-cost" type="text" inputMode="decimal" value={costPrice} onChange={e => { setCostPrice(e.target.value.replace(/[^0-9.]/g, '')); setDirty(true); }} placeholder="0.00" />
              </Field>
            )}
            <Field label="Selling Price" required tooltip="Required for POS billing and profit calculation" id="prod-selling">
              <Input id="prod-selling" type="text" inputMode="decimal" value={sellingPrice} onChange={e => { setSellingPrice(e.target.value.replace(/[^0-9.]/g, '')); setDirty(true); }} placeholder="0.00" />
            </Field>
            <Field label="Unit" required tooltip="Measurement unit for this product" id="prod-unit">
              <select id="prod-unit" value={unit} onChange={e => { setUnit(e.target.value); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Low Stock Threshold" tooltip="Alert when stock falls below this number" id="prod-threshold">
              <Input id="prod-threshold" type="text" inputMode="numeric" value={threshold} onChange={e => { setThreshold(e.target.value.replace(/\D/g, '')); setDirty(true); }} placeholder="5" />
            </Field>
            {category?.hasExpiry && (
              <Field label="Expiry Date" required tooltip="Required because this category tracks expiry" id="prod-expiry">
                <Input id="prod-expiry" type="date" value={expiryDate} onChange={e => { setExpiryDate(e.target.value); setDirty(true); }} />
              </Field>
            )}
          </div>
          <Field label="Supplier" tooltip="Preferred supplier for this product" id="prod-supplier">
            <div className="flex gap-2">
              <select id="prod-supplier" value={supplierId} onChange={e => { setSupplierId(e.target.value); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowAddSupplier(true)} title="Add new supplier"><Plus className="h-4 w-4" /></Button>
            </div>
            {showAddSupplier && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Input value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} placeholder="Phone" className="text-sm w-full sm:w-32" />
                <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Supplier name" className="text-sm flex-1 min-w-[140px]" />
                <Button type="button" size="sm" disabled={!newSupplierName.trim() || addSupplier.isPending} onClick={async () => {
                  const r = await addSupplier.mutateAsync({ name: newSupplierName.trim(), contactPhone: newSupplierPhone.trim() || undefined });
                  if (r.success) { setSupplierId(r.value.id); setShowAddSupplier(false); setNewSupplierName(''); setNewSupplierPhone(''); }
                }}>{addSupplier.isPending ? 'Adding...' : 'Add'}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddSupplier(false); setNewSupplierName(''); setNewSupplierPhone(''); }}>Cancel</Button>
              </div>
            )}
            {showAddSupplier && newSupplierLookup.isFetching && newSupplierPhone.trim().length >= 10 && (
              <p className="text-muted-foreground text-xs mt-1">Looking up phone number…</p>
            )}
            {showAddSupplier && newSupplierLookup.data && (
              <p className="bg-muted text-muted-foreground rounded-md px-2.5 py-1.5 text-xs mt-1">
                Existing supplier found — name filled automatically.
              </p>
            )}
          </Field>
          {validation.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-1">
              {validation.map((err, i) => <p key={i} className="text-destructive text-xs flex items-center gap-1"><X className="h-3 w-3 shrink-0" />{err}</p>)}
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || createProduct.isPending}>
            {createProduct.isPending ? 'Creating...' : 'Add Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditProductDialog({ product, categories, suppliers, canViewCost, onOpenChange }: { product: Product; categories: Category[]; suppliers: Supplier[]; canViewCost: boolean; onOpenChange: (v: boolean) => void }) {
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();
  const [catId, setCatId] = useState(product.categoryId);
  const [name, setName] = useState(product.name);
  const [attrs, setAttrs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(product.attributeValues ?? {}).map(([k, v]) => [k, String(v)]))
  );
  const [costPrice, setCostPrice] = useState(String(product.costPrice || ''));
  const [sellingPrice, setSellingPrice] = useState(String(product.sellingPrice || ''));
  const [unit, setUnit] = useState(product.unit);
  const [threshold, setThreshold] = useState(String(product.lowStockThreshold || ''));
  const [supplierId, setSupplierId] = useState(product.supplierId ?? '');
  const [expiryDate, setExpiryDate] = useState(product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '');
  const [dirty, setDirty] = useState(false);
  const category = categories.find(c => c.id === catId);

  const canSubmit = !!catId && !!name.trim() && !!sellingPrice.trim() && Number(sellingPrice) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const data: Record<string, unknown> = {
      categoryId: catId,
      name: name.trim(),
      attributeValues: attrs,
      sellingPrice: Math.round(Number(sellingPrice) * 100) / 100,
      unit,
      lowStockThreshold: threshold ? Math.round(Number(threshold)) : 5,
      supplierId: supplierId || null,
      expiryDate: category?.hasExpiry && expiryDate ? new Date(expiryDate) : null,
    };
    if (canViewCost) data.costPrice = Math.round(Number(costPrice) * 100) / 100;
    await updateProduct.mutateAsync({ id: product.id, data });
    const trimmedName = name.trim();
    if (trimmedName && category && !(category.productNames ?? []).includes(trimmedName)) {
      try {
        await categoryRepository.update(catId, { productNames: [...(category.productNames ?? []), trimmedName] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch { /* best effort */ }
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="edit-prod-title">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 id="edit-prod-title" className="text-lg font-semibold">Edit Product</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Category" required tooltip="Every product must belong to a category for SKU generation and organization" id="edit-prod-cat">
            <select id="edit-prod-cat" value={catId} onChange={e => { setCatId(e.target.value); setAttrs({}); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.codePrefix})</option>)}
            </select>
          </Field>
          <Field label="Product Name" required tooltip="Pick a predefined name or choose New to add one" id="edit-prod-name">
            <ProductNameSelector options={category?.productNames ?? []} value={name} onChange={v => { setName(v); setDirty(true); }} />
          </Field>
          {category && category.attributeSchema.map(attr => (
            <Field key={attr.key} label={attr.label} required={attr.required} tooltip={`Custom attribute defined by the "${category.name}" category`} id={`edit-attr-${attr.key}`}>
              {attr.type === 'select' ? (
                <select value={attrs[attr.key] ?? ''} onChange={e => { setAttrs({ ...attrs, [attr.key]: e.target.value }); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Select...</option>
                  {(attr.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input type={attr.type === 'number' ? 'number' : 'text'} value={attrs[attr.key] ?? ''} onChange={e => { setAttrs({ ...attrs, [attr.key]: e.target.value }); setDirty(true); }} placeholder={attr.label} />
              )}
            </Field>
          ))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {canViewCost && (
              <Field label="Cost Price" tooltip="Purchase cost per unit. Only owners can view or set this." id="edit-prod-cost">
                <Input id="edit-prod-cost" type="text" inputMode="decimal" value={costPrice} onChange={e => { setCostPrice(e.target.value.replace(/[^0-9.]/g, '')); setDirty(true); }} placeholder="0.00" />
              </Field>
            )}
            <Field label="Selling Price" required tooltip="Required for POS billing and profit calculation" id="edit-prod-selling">
              <Input id="edit-prod-selling" type="text" inputMode="decimal" value={sellingPrice} onChange={e => { setSellingPrice(e.target.value.replace(/[^0-9.]/g, '')); setDirty(true); }} placeholder="0.00" />
            </Field>
            <Field label="Unit" required tooltip="Measurement unit for this product" id="edit-prod-unit">
              <select id="edit-prod-unit" value={unit} onChange={e => { setUnit(e.target.value); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Low Stock Threshold" tooltip="Alert when stock falls below this number" id="edit-prod-threshold">
              <Input id="edit-prod-threshold" type="text" inputMode="numeric" value={threshold} onChange={e => { setThreshold(e.target.value.replace(/\D/g, '')); setDirty(true); }} placeholder="5" />
            </Field>
            {category?.hasExpiry && (
              <Field label="Expiry Date" tooltip="Expiry date for this product" id="edit-prod-expiry">
                <Input id="edit-prod-expiry" type="date" value={expiryDate} onChange={e => { setExpiryDate(e.target.value); setDirty(true); }} />
              </Field>
            )}
          </div>
          <Field label="Supplier" tooltip="Preferred supplier for this product" id="edit-prod-supplier">
            <select id="edit-prod-supplier" value={supplierId} onChange={e => { setSupplierId(e.target.value); setDirty(true); }} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">None</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || updateProduct.isPending}>
            {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ────── INVENTORY ────── */

function StockLedgerView({ products, selectedProductId, onSelectProduct }: { products: Product[]; categories: Category[]; selectedProductId: string | null; onSelectProduct: (id: string | null) => void }) {
  const movementsQ = useStockMovements(selectedProductId ?? '');
  const movements: StockMovement[] = useMemo(() => movementsQ.data ?? [], [movementsQ.data]);
  const serializedItemsQ = useSerializedItems(selectedProductId ?? '');
  const allSerials: SerializedItem[] = useMemo(() => serializedItemsQ.data ?? [], [serializedItemsQ.data]);
  const createSerials = useCreateSerializedItems();
  const restockSerials = useRestockSerializedItems();

  const [mFilter, setMFilter] = useState<'ALL' | 'IN' | 'OUT' | 'SALE'>('ALL');
  const product = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  const [addingSerial, setAddingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [serialPage, setSerialPage] = useState(1);
  const [backfilling, setBackfilling] = useState(false);

  const currentStock = useMemo(() => {
    let stock = 0;
    for (const m of movements) {
      if (m.type === 'RESTOCK_IN') stock += m.quantity;
      else stock -= m.quantity;
    }
    return stock;
  }, [movements]);

  const filteredMovements = useMemo(() => {
    if (mFilter === 'ALL') return movements;
    const match =
      mFilter === 'IN' ? ['RESTOCK_IN']
      : mFilter === 'OUT' ? ['MANUAL_OUT']
      : ['POS_SALE', 'VEHICLE_TASK_USE'];
    return movements.filter(m => match.includes(m.type));
  }, [movements, mFilter]);

  const SERIAL_PAGE_SIZE = 10;
  const serialTotalPages = Math.max(1, Math.ceil(allSerials.length / SERIAL_PAGE_SIZE));
  const safeSerialPage = Math.min(serialPage, serialTotalPages);
  const paginatedSerials = useMemo(
    () => [...allSerials].reverse().slice((safeSerialPage - 1) * SERIAL_PAGE_SIZE, safeSerialPage * SERIAL_PAGE_SIZE),
    [allSerials, safeSerialPage],
  );

  const handleAddSerialNumber = async () => {
    if (!selectedProductId || !product || addingSerial) return;
    const serials = [...new Set(serialInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))];
    if (serials.length === 0) {
      toast.error('Enter at least one serial number');
      return;
    }
    const existing = serials.filter(s => allSerials.some(item => item.serialNumber === s));
    if (existing.length > 0) {
      toast.error(`Serial already exists: ${existing.join(', ')}`);
      return;
    }
    setAddingSerial(true);
    try {
      const result = await restockSerials.mutateAsync({ productId: selectedProductId, serialNumbers: serials });
      if (result) {
        setSerialInput('');
        setSerialPage(1);
      }
    } finally {
      setAddingSerial(false);
    }
  };

  const handleGenerateSerialsForExisting = async () => {
    if (!selectedProductId || !product || backfilling || currentStock <= 0) return;
    setBackfilling(true);
    try {
      const serials = generateSerialNumbers(product.sku, [], currentStock);
      await createSerials.mutateAsync({ productId: selectedProductId, serialNumbers: serials });
    } finally {
      setBackfilling(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product list */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Products</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" aria-label="Search stock products" />
        </div>
        <div className="space-y-1 max-h-[70vh] overflow-y-auto" role="listbox" aria-label="Product list">
          {products.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <button
              key={p.id}
              role="option"
              aria-selected={selectedProductId === p.id}
              onClick={() => { onSelectProduct(p.id); setMFilter('ALL'); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProductId === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <span className="font-mono text-xs block opacity-70">{p.sku}</span>
              <span className="font-medium">{p.name}</span>
              <span className={`text-xs block ${p.currentStock <= p.lowStockThreshold ? 'text-destructive' : 'text-muted-foreground'}`}>
                Stock: {p.currentStock} {p.currentStock <= p.lowStockThreshold && <AlertTriangle className="h-3 w-3 inline" />}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Stock details */}
      <div className="lg:col-span-2 space-y-6">
        {product ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{product.name}</span>
                      <span className="text-muted-foreground font-mono text-sm font-normal shrink-0">({product.sku})</span>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Stock</p>
                    <p className={`text-3xl font-bold ${currentStock <= product.lowStockThreshold ? 'text-destructive' : ''}`}>{currentStock}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Threshold</p>
                    <p className="text-lg font-semibold">{product.lowStockThreshold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Unit</p>
                    <p className="text-lg font-semibold">{product.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Movements</p>
                    <p className="text-lg font-semibold">{movements.length}</p>
                  </div>
                </div>
                {currentStock <= product.lowStockThreshold && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Stock is low. Consider restocking.
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Serialized Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Serialized Items</CardTitle>
                  <span className="text-sm text-muted-foreground">{allSerials.filter(s => s.isAvailable).length} in stock / {allSerials.length} total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={serialInput}
                    onChange={e => setSerialInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSerialNumber(); } }}
                    placeholder="Enter serial numbers (comma/newline separated)..."
                    className="h-8 text-sm"
                    disabled={addingSerial || restockSerials.isPending}
                    aria-label="Serial numbers"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddSerialNumber}
                    disabled={addingSerial || restockSerials.isPending || !serialInput.trim()}
                    aria-label="Add serials"
                    title="Add serial numbers"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {serializedItemsQ.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : allSerials.length === 0 && currentStock > 0 ? (
                  <div className="space-y-3 py-2 text-center">
                    <p className="text-muted-foreground text-sm">This product has {currentStock} in stock but no serialized items yet.</p>
                    <Button size="sm" variant="outline" onClick={handleGenerateSerialsForExisting} disabled={backfilling || createSerials.isPending}>
                      {backfilling ? 'Generating...' : `Generate ${currentStock} Serial(s)`}
                    </Button>
                  </div>
                ) : allSerials.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No serialized items yet. Type a serial number and click + to add it.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      {paginatedSerials.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm py-2 px-2 rounded hover:bg-muted/30">
                          <span className="font-mono">{s.serialNumber}</span>
                          <Badge variant={s.isAvailable ? 'default' : 'secondary'} className="text-xs">
                            {s.isAvailable ? 'In Stock' : 'Sold/Used'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {serialTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t">
                        <span className="text-xs text-muted-foreground">
                          Page {safeSerialPage} of {serialTotalPages} ({allSerials.length} items)
                        </span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" disabled={safeSerialPage <= 1} onClick={() => setSerialPage(p => Math.max(1, p - 1))} aria-label="Previous page">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7" disabled={safeSerialPage >= serialTotalPages} onClick={() => setSerialPage(p => Math.min(serialTotalPages, p + 1))} aria-label="Next page">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            {/* Movement History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Movement History</CardTitle>
                  <div className="flex gap-1">
                    {(['ALL', 'IN', 'OUT', 'SALE'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setMFilter(t)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${mFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {movementsQ.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : filteredMovements.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No movements recorded yet.</p>
                ) : (
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {[...filteredMovements].reverse().map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm py-3 border-b last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${m.type === 'RESTOCK_IN' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.type === 'RESTOCK_IN' ? 'Restock In' : m.type === 'MANUAL_OUT' ? 'Adjust Out' : m.type === 'POS_SALE' ? 'POS Sale' : 'Vehicle Task Use'}</span>
                              <span className="text-muted-foreground text-xs" title={new Date(m.createdAt).toLocaleString('en-IN')}>{timeAgo(m.createdAt)}</span>
                            </div>
                            {m.note && m.type !== 'RESTOCK_IN' && (
                              <p className="text-muted-foreground text-xs truncate max-w-[240px]" title={m.note}>{m.note}</p>
                            )}
                          </div>
                        <span className={`font-semibold shrink-0 ${m.type === 'RESTOCK_IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'RESTOCK_IN' ? '+' : '-'}{m.quantity}
                        </span>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-96">
            <EmptyState title="No product selected" description="Select a product from the list to view stock details and movement history." />
          </div>
        )}
      </div>
    </div>
  );
}

/* ────── ADJUST OUT ────── */

function AdjustOutView({ products, selectedProductId, onSelectProduct }: { products: Product[]; selectedProductId: string | null; onSelectProduct: (id: string | null) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const product = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product list */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Products</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" aria-label="Search products to adjust" />
        </div>
        <div className="space-y-1 max-h-[70vh] overflow-y-auto" role="listbox" aria-label="Product list">
          {products.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <button
              key={p.id}
              role="option"
              aria-selected={selectedProductId === p.id}
              onClick={() => onSelectProduct(p.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProductId === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <span className="font-mono text-xs block opacity-70">{p.sku}</span>
              <span className="font-medium">{p.name}</span>
              <span className={`text-xs block ${p.currentStock <= p.lowStockThreshold ? 'text-destructive' : 'text-muted-foreground'}`}>
                Stock: {p.currentStock}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Adjust panel */}
      <div className="lg:col-span-2 space-y-6">
        {product ? (
          <AdjustOutCard product={product} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <EmptyState title="No product selected" description="Select a product from the list to adjust stock out." />
          </div>
        )}
      </div>
    </div>
  );
}

function AdjustOutCard({ product }: { product: Product }) {
  const recordMovement = useRecordStockMovement();
  const removeSerials = useRemoveSerializedItems();
  const availableSerialsQ = useAvailableSerializedItems(product.id);
  const availableSerials: SerializedItem[] = useMemo(() => availableSerialsQ.data ?? [], [availableSerialsQ.data]);

  const [adjustMode, setAdjustMode] = useState<'bulk' | 'individual'>('bulk');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState('');
  const [individualReasons, setIndividualReasons] = useState<Record<string, string>>({});

  const toggleSerial = (id: string) => {
    setSelectedSerials(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleBulkAdjustOut = async () => {
    if (selectedSerials.length === 0 || !bulkReason.trim()) return;
    const result = await recordMovement.mutateAsync({
      productId: product.id, type: 'MANUAL_OUT', quantity: selectedSerials.length,
      note: bulkReason.trim(), supplierId: undefined,
    });
    if (!result.success) return;
    await removeSerials.mutateAsync({ ids: selectedSerials, productId: product.id });
    setSelectedSerials([]); setBulkReason('');
  };

  const handleIndividualAdjustOut = async (serial: SerializedItem) => {
    const reason = (individualReasons[serial.id] ?? '').trim();
    if (!reason) return;
    const result = await recordMovement.mutateAsync({
      productId: product.id, type: 'MANUAL_OUT', quantity: 1,
      note: reason, supplierId: undefined,
    });
    if (!result.success) return;
    await removeSerials.mutateAsync({ ids: [serial.id], productId: product.id });
    setIndividualReasons(prev => { const next = { ...prev }; delete next[serial.id]; return next; });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <span className="truncate">{product.name}</span>
              <span className="text-muted-foreground font-mono text-sm font-normal shrink-0">({product.sku})</span>
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Adjust Out</p>
          </div>
          <div className="flex shrink-0 gap-1">
            {(['bulk', 'individual'] as const).map(m => (
              <button
                key={m}
                onClick={() => setAdjustMode(m)}
                className={`px-2 py-1 text-xs rounded transition-colors ${adjustMode === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'bulk' ? 'Bulk (same reason)' : 'One by One'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Available to remove: <span className="font-medium text-foreground">{availableSerials.length}</span>
        </p>
        {availableSerialsQ.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : availableSerials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No available serials to remove.</p>
        ) : adjustMode === 'bulk' ? (
          <>
            <div className="space-y-1 max-h-72 overflow-y-auto border rounded-md p-2">
              <p className="text-xs text-muted-foreground mb-1">Select serials to remove:</p>
              {availableSerials.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedSerials.includes(s.id)} onChange={() => toggleSerial(s.id)} className="rounded" />
                  <span className="font-mono">{s.serialNumber}</span>
                </label>
              ))}
            </div>
            <div>
              <Field label="Reason" required tooltip="Applied to all selected serials" id="adjust-bulk-reason">
                <Input id="adjust-bulk-reason" value={bulkReason} onChange={e => setBulkReason(e.target.value)} placeholder="e.g. Damaged, Lost, Returned" />
              </Field>
            </div>
            <Button
              onClick={handleBulkAdjustOut}
              disabled={recordMovement.isPending || selectedSerials.length === 0 || !bulkReason.trim()}
            >
              {recordMovement.isPending ? 'Recording...' : `Adjust Out ${selectedSerials.length} Item(s)`}
            </Button>
          </>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableSerials.map(s => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                <span className="font-mono text-sm shrink-0">{s.serialNumber}</span>
                <Input
                  value={individualReasons[s.id] ?? ''}
                  onChange={e => setIndividualReasons(prev => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder="Reason for this serial"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => handleIndividualAdjustOut(s)}
                  disabled={recordMovement.isPending || !(individualReasons[s.id] ?? '').trim()}
                >
                  Adjust Out
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────── ARCHIVED ────── */

function ArchivedView({ products, categories, suppliers, isLoading, error, onRefetch }: { products: Product[]; categories: Category[]; suppliers: Supplier[]; isLoading: boolean; error: Error | null; onRefetch: () => void }) {
  const [subTab, setSubTab] = useState<ArchivedSubTab>('products');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (error) return <EmptyState title="Failed to load archived items" description={error.message} action={<Button variant="outline" size="sm" onClick={onRefetch}>Retry</Button>} />;

  const currentItems = subTab === 'products' ? products : subTab === 'categories' ? categories : suppliers;
  const label = subTab === 'products' ? 'products' : subTab === 'categories' ? 'categories' : 'suppliers';
  const total = currentItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (total === 0) return <EmptyState title={`No archived ${label}`} description={`Archived ${label} will appear here.`} />;

  const subTabs: { key: ArchivedSubTab; label: string; count: number }[] = [
    { key: 'products', label: 'Products', count: products.length },
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'suppliers', label: 'Suppliers', count: suppliers.length },
  ];

  const handleSubTabChange = (key: ArchivedSubTab) => { setSubTab(key); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleSubTabChange(t.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-t transition-colors ${subTab === t.key ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{total} archived {label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subTab === 'products' && products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map(p => <ArchivedProductCard key={p.id} product={p} onAction={onRefetch} />)}
        {subTab === 'categories' && categories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map(c => <ArchivedCategoryCard key={c.id} category={c} onAction={onRefetch} />)}
        {subTab === 'suppliers' && suppliers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map(s => <ArchivedSupplierCard key={s.id} supplier={s} onAction={onRefetch} />)}
      </div>
      {totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-2">
        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm text-muted-foreground">{safePage} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>}
    </div>
  );
}

function ArchivedProductCard({ product, onAction }: { product: Product; onAction: () => void }) {
  const unarchive = useUnarchiveProduct();
  const deleteProduct = useHardDeleteProduct();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  return (
    <>
      <Card className="border-muted/50 opacity-80 hover:opacity-100 transition-opacity min-w-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{product.sku}</span>
                <h3 className="font-semibold truncate">{product.name}</h3>
                <Badge variant="warning" className="text-[10px]">Archived</Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                <span>Stock: {product.currentStock}</span>
                <span>Selling: {fmt(product.sellingPrice)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setIsDelete(false); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                aria-label="Restore product"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setIsDelete(true); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10"
                aria-label="Permanently delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`${product.id}-${isDelete ? 'delete' : 'restore'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (isDelete) await deleteProduct.mutateAsync(product.id);
          else await unarchive.mutateAsync(product.id);
          onAction();
        }}
        title={isDelete ? 'Delete Product' : 'Restore Product'}
        description={isDelete
          ? `Permanently delete "${product.name}" (${product.sku})? This cannot be undone.`
          : `Restore "${product.name}" (${product.sku})? It will reappear in products.`}
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteProduct.isPending}
      />
    </>
  );
}

function ArchivedCategoryCard({ category, onAction }: { category: Category; onAction: () => void }) {
  const unarchive = useUnarchiveCategory();
  const deleteCategory = useHardDeleteCategory();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  return (
    <>
      <Card className="border-muted/50 opacity-80 hover:opacity-100 transition-opacity min-w-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{category.name}</h3>
                <Badge variant="warning" className="text-[10px]">Archived</Badge>
              </div>
              {category.codePrefix && <p className="text-xs text-muted-foreground mt-1">Code: {category.codePrefix}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setIsDelete(false); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                aria-label="Restore category"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setIsDelete(true); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10"
                aria-label="Permanently delete category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`${category.id}-${isDelete ? 'delete' : 'restore'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (isDelete) await deleteCategory.mutateAsync(category.id);
          else await unarchive.mutateAsync(category.id);
          onAction();
        }}
        title={isDelete ? 'Delete Category' : 'Restore Category'}
        description={isDelete
          ? `Permanently delete "${category.name}"? This cannot be undone.`
          : `Restore "${category.name}"? It will reappear in categories.`}
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteCategory.isPending}
      />
    </>
  );
}

function ArchivedSupplierCard({ supplier, onAction }: { supplier: Supplier; onAction: () => void }) {
  const unarchive = useUnarchiveSupplier();
  const deleteSupplier = useHardDeleteSupplier();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  return (
    <>
      <Card className="border-muted/50 opacity-80 hover:opacity-100 transition-opacity min-w-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{supplier.name}</h3>
                <Badge variant="warning" className="text-[10px]">Archived</Badge>
              </div>
              {supplier.contactPhone && <p className="text-xs text-muted-foreground mt-1">{supplier.contactPhone}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setIsDelete(false); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                aria-label="Restore supplier"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setIsDelete(true); setConfirmOpen(true); }}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-destructive/10"
                aria-label="Permanently delete supplier"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`${supplier.id}-${isDelete ? 'delete' : 'restore'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (isDelete) await deleteSupplier.mutateAsync(supplier.id);
          else await unarchive.mutateAsync(supplier.id);
          onAction();
        }}
        title={isDelete ? 'Delete Supplier' : 'Restore Supplier'}
        description={isDelete
          ? `Permanently delete "${supplier.name}"? This cannot be undone.`
          : `Restore "${supplier.name}"? It will reappear in suppliers.`}
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteSupplier.isPending}
      />
    </>
  );
}

/* ────── Field Helper ────── */

function Field({ label, required, tooltip, children, id }: { label: string; required?: boolean; tooltip?: string; children: React.ReactNode; id: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span
            className="text-destructive font-bold text-sm cursor-help relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            tabIndex={0}
            role="note"
            aria-label={tooltip ? `Required: ${tooltip}` : 'Required field'}
          >
            *
            {showTooltip && tooltip && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg border whitespace-nowrap z-50" role="tooltip">
                {tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
              </span>
            )}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
