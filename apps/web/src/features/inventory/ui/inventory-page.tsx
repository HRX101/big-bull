'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '@car-spa/infrastructure';
import {
  Box,
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  Edit,
  Trash2,
  Search,
  Copy,
  Eye,
  Archive,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArchiveRestore,
  LayoutGrid,
  List,
  Table2,
} from 'lucide-react';
import {
  type Category,
  type Product,
  type Supplier,
  type StockMovement,
  type SerializedItem,
} from '@car-spa/domain';
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
import { PaginationControls } from '@/components/shared/pagination';
import { PageHeader } from '@/components/shared/page-header';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useArchiveCategory,
  useHardDeleteCategory,
  useProducts,
  useProductSearch,
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useHardDeleteProduct,
  useArchivedProducts,
  useUnarchiveProduct,
  useArchivedCategories,
  useUnarchiveCategory,
  useArchivedSuppliers,
  useUnarchiveSupplier,
  useStockMovements,
  useRecordStockMovement,
  useRestockSerializedItems,
  useSuppliers,
  useCreateSupplier,
  useHardDeleteSupplier,
  useSupplierByPhone,
  useSerializedItems,
  useAvailableSerializedItems,
  useCreateSerializedItems,
  useRemoveSerializedItems,
} from '../api/use-inventory';
import { ImportProductsDialog } from './import-products-dialog';

type Tab = 'categories' | 'products' | 'inventory' | 'adjustout' | 'archived';
type ArchivedSubTab = 'products' | 'categories' | 'suppliers';
type SortField = 'name' | 'sku' | 'currentStock' | 'sellingPrice' | 'createdAt';
type SortDir = 'asc' | 'desc';
type ProductView = 'list' | 'table';

const PAGE_SIZE = 5;

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

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
}
function timeAgo(d: Date) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  const suppliersQ = useSuppliers(orgId, { enabled: tab === 'products' });
  const {
    query: searchQuery,
    setSearch,
    results: searchResults,
    isSearching,
  } = useProductSearch(orgId);
  const productData = useMemo(
    () => (isSearching ? (searchResults.data ?? []) : (productsQ.data ?? [])),
    [isSearching, searchResults.data, productsQ.data],
  );

  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const products = useMemo(
    () => prodFilter(productData, selectedCatId),
    [productData, selectedCatId],
  );
  const suppliers = useMemo(() => suppliersQ.data ?? [], [suppliersQ.data]);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [productView, setProductView] = useState<ProductView>('table');

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'sku') cmp = a.sku.localeCompare(b.sku);
      else if (sortField === 'currentStock') cmp = a.currentStock - b.currentStock;
      else if (sortField === 'sellingPrice') cmp = a.sellingPrice - b.sellingPrice;
      else if (sortField === 'createdAt')
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          className="mb-4"
          eyebrow="Inventory"
          title="Inventory"
          description="Manage products, stock, and suppliers"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {tab === 'products' && (
                <div className="relative w-full sm:w-72">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name, SKU, or category..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9"
                    aria-label="Search products"
                  />
                </div>
              )}
              {tab === 'categories' && <CreateCategoryDialog />}
              {tab === 'products' && (
                <>
                  <ImportProductsDialog
                    categories={categories}
                    suppliers={suppliers}
                    canViewCost={canViewCost}
                  />
                  <CreateProductDialog
                    categories={categories}
                    suppliers={suppliers}
                    canViewCost={canViewCost}
                  />
                </>
              )}
            </div>
          }
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="bg-muted/60 border-border flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1.5 shadow-inner"
            role="tablist"
            aria-label="Inventory sections"
          >
            {tabs.map((t) => {
              const active = tab === t.key;
              const count =
                t.key === 'categories'
                  ? categories.length
                  : t.key === 'products'
                    ? products.length
                    : undefined;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.key);
                    setSelectedCatId(null);
                    setSelectedProductId(null);
                    setPage(1);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.97] ${
                    active
                      ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md shadow-blue-500/30'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground'
                  }`}
                >
                  <t.icon className={`h-4 w-4 ${active ? '' : 'text-muted-foreground/70'}`} />
                  {t.label}
                  {count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        active ? 'bg-white/25 text-white' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {tab === 'products' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-muted/60 flex items-center gap-1 rounded-lg border p-0.5">
                <Button
                  variant={productView === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setProductView('table')}
                  className="gap-1.5"
                >
                  <Table2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant={productView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setProductView('list')}
                  className="gap-1.5"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <SortButton
                  field="name"
                  label="Name"
                  current={sortField}
                  dir={sortDir}
                  onClick={toggleSort}
                />
                <SortButton
                  field="sku"
                  label="SKU"
                  current={sortField}
                  dir={sortDir}
                  onClick={toggleSort}
                />
                <SortButton
                  field="currentStock"
                  label="Stock"
                  current={sortField}
                  dir={sortDir}
                  onClick={toggleSort}
                />
                <SortButton
                  field="sellingPrice"
                  label="Price"
                  current={sortField}
                  dir={sortDir}
                  onClick={toggleSort}
                />
              </div>
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
              onRefetch={() => {
                productsQ.refetch();
                searchResults.refetch();
              }}
              canViewCost={canViewCost}
              view={productView}
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
          {tab === 'archived' && <ArchivedView orgId={orgId} />}
        </div>
      </motion.div>
    </div>
  );
}

function prodFilter(products: Product[], catId: string | null) {
  if (!catId) return products;
  return products.filter((p) => p.categoryId === catId);
}

function SortButton({
  field,
  label,
  current,
  dir,
  onClick,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-label={`Sort by ${label} ${active ? `(${dir === 'asc' ? 'ascending' : 'descending'})` : ''}`}
    >
      {label}
      {active && (
        <ArrowUpDown
          className={`h-3 w-3 transition-transform ${dir === 'desc' ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );
}

/* ────── CATEGORIES ────── */

function CategoriesView({
  categories,
  isLoading,
  error,
  onRefetch,
}: {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const total = categories.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = categories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="text-destructive h-8 w-8" />
        <p className="text-muted-foreground">Failed to load categories.</p>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          Retry
        </Button>
      </div>
    );

  if (categories.length === 0)
    return (
      <EmptyState
        title="No categories yet"
        description="Categories help you organize products by type (e.g. Tyres, Engine Oil, Batteries)."
        action={<CreateCategoryDialog />}
      />
    );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {total} categor{'y'}
        {total === 1 ? '' : 'ies'}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginated.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
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
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    updateCat.mutateAsync({ id: category.id, data: { name, lowStockThresholdDefault: threshold } });
    setEditing(false);
  };

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{category.name}</CardTitle>
            <p className="text-muted-foreground text-sm">
              Prefix: <span className="font-mono">{category.codePrefix}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(!editing)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
              aria-label="Edit category"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={requestArchive}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
              aria-label="Archive category"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={requestDelete}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1"
              aria-label="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {editing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cat-name-edit">Name</Label>
                <Input id="cat-name-edit" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cat-threshold-edit">Low Stock Threshold</Label>
                <Input
                  id="cat-threshold-edit"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={updateCat.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <span className="bg-muted rounded px-2 py-0.5 text-xs">
                  Threshold: {category.lowStockThresholdDefault}
                </span>
                <span className="bg-muted rounded px-2 py-0.5 text-xs">
                  Expiry: {category.hasExpiry ? 'Yes' : 'No'}
                </span>
                <span className="bg-muted rounded px-2 py-0.5 text-xs">
                  Attributes: {category.attributeSchema.length}
                </span>
              </div>
              {category.attributeSchema.length > 0 && (
                <div className="mt-2 space-y-1">
                  {category.attributeSchema.map((a, i) => (
                    <div
                      key={i}
                      className="bg-muted/50 flex flex-wrap items-center gap-2 rounded px-2 py-1 text-xs"
                    >
                      <span className="font-medium">{a.label}</span>
                      <span className="text-muted-foreground">({a.type})</span>
                      {a.required && (
                        <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                          required
                        </Badge>
                      )}
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
        description={
          confirmType === 'archive'
            ? `Are you sure you want to archive "${category.name}"? It will be hidden from products view.`
            : `Permanently delete "${category.name}"? This removes the category and all its products and serialized items.`
        }
        variant={confirmType === 'archive' ? 'warning' : 'destructive'}
        confirmLabel={confirmType === 'archive' ? 'Archive' : 'Delete'}
        loading={archiveCat.isPending || deleteCat.isPending}
      />
    </>
  );
}

function deriveCodePrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const cleaned = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  const base = initials.length >= 2 ? initials : cleaned;
  return (base || 'CAT').slice(0, 5);
}

function CreateCategoryDialog() {
  const createCat = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    const result = await createCat.mutateAsync({
      name: name.trim(),
      codePrefix: deriveCodePrefix(name),
      lowStockThresholdDefault: 5,
      hasExpiry,
      attributeSchema: [],
    });
    if (!result.success) return;
    setOpen(false);
    setName('');
    setHasExpiry(false);
    setDirty(false);
  };

  const requestClose = () => {
    if (dirty) setDiscardOpen(true);
    else setOpen(false);
  };

  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Create Category
      </Button>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-cat-title"
    >
      <div
        className="bg-background flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="from-navy-light to-navy bg-gradient-to-br px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/20 text-blue-200">
                <Box className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-sky-300 uppercase">
                  Inventory
                </p>
                <h2 id="create-cat-title" className="text-lg font-semibold">
                  Create Category
                </h2>
                <p className="text-sm text-white/60">Organize products by type</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={requestClose}
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-[13px] font-medium">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder="e.g. Tyres, Engine Oil"
              autoFocus
            />
          </div>

          <label className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors">
            <span className="text-foreground text-sm font-medium">Has expiry dates</span>
            <input
              type="checkbox"
              checked={hasExpiry}
              onChange={(e) => {
                setHasExpiry(e.target.checked);
                setDirty(true);
              }}
              className="h-5 w-5 rounded accent-blue-600"
            />
          </label>

          <Button
            className="w-full shadow-md shadow-blue-900/20"
            onClick={handleSubmit}
            disabled={!canSubmit || createCat.isPending}
          >
            {createCat.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Category
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => setOpen(false)}
        title="Discard changes?"
        description="You have unsaved changes. They will be lost if you close this dialog."
        confirmLabel="Discard"
        variant="warning"
        icon={AlertTriangle}
      />
    </div>
  );
}

/* ────── PRODUCTS ────── */

function ProductsView({
  products,
  total,
  page,
  totalPages,
  onPageChange,
  categories,
  suppliers,
  selectedCatId,
  onSelectCategory,
  onSelectProduct: _onSelectProduct,
  isLoading,
  error,
  onRefetch,
  canViewCost,
  view,
}: {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  categories: Category[];
  suppliers: Supplier[];
  selectedCatId: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectProduct: (id: string | null) => void;
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
  canViewCost: boolean;
  view: ProductView;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Mobile Horizontal Category Bar */}
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 lg:hidden">
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            !selectedCatId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:text-foreground border'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          All
        </button>
        {categories.map((cat) => {
          const active = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground border'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <div className="bg-card hidden space-y-1 self-start rounded-xl border p-3 shadow-sm lg:col-span-1 lg:block">
        <h3 className="text-muted-foreground mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <Box className="h-3.5 w-3.5" />
          Filter by Category
        </h3>
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full rounded-lg text-left text-sm transition-all duration-150 ${!selectedCatId ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
        >
          <span className="flex items-center gap-2.5 px-2.5 py-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                !selectedCatId ? 'bg-white/20' : 'bg-blue-500/10 text-blue-600'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">All Products</span>
          </span>
        </button>
        {categories.map((cat) => {
          const active = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full rounded-lg text-left text-sm transition-all duration-150 ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
            >
              <span className="flex items-center gap-2.5 px-2.5 py-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                    active ? 'bg-white/20' : 'bg-blue-500/10 text-blue-600'
                  }`}
                >
                  {cat.codePrefix.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                <span
                  className={`shrink-0 font-mono text-[10px] ${
                    active ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {cat.codePrefix}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-3 lg:col-span-3">
        {isLoading ? (
          view === 'table' ? (
            <div className="border-border overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-border border-b">
                    {Array.from({ length: canViewCost ? 8 : 7 }).map((_, i) => (
                      <th key={i} className="px-4 py-3">
                        <Skeleton className="h-4 w-16" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-border border-b">
                      {Array.from({ length: canViewCost ? 8 : 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <AlertTriangle className="text-destructive h-8 w-8" />
            <p className="text-muted-foreground">Failed to load products.</p>
            <Button variant="outline" size="sm" onClick={onRefetch}>
              Retry
            </Button>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              selectedCatId
                ? 'This category has no products yet.'
                : 'Try adjusting your search or filters.'
            }
            action={
              !selectedCatId ? (
                <CreateProductDialog
                  categories={categories}
                  suppliers={suppliers}
                  canViewCost={canViewCost}
                />
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {total} product{total !== 1 ? 's' : ''}
              </span>
              <span className="bg-muted-foreground/40 h-1 w-1 rounded-full" />
              <span className="text-muted-foreground text-sm capitalize">
                {selectedCatId
                  ? (categories.find((c) => c.id === selectedCatId)?.name ?? '')
                  : 'all categories'}
              </span>
            </div>
            {view === 'table' ? (
              <ProductsTableView
                products={products}
                categories={categories}
                suppliers={suppliers}
                canViewCost={canViewCost}
              />
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categories={categories}
                    suppliers={suppliers}
                    canViewCost={canViewCost}
                  />
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductsTableView({
  products,
  categories,
  suppliers,
  canViewCost,
}: {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-border border-b">
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="px-4 py-3 text-left font-medium">Unit</th>
            <th className="px-4 py-3 text-right font-medium">Selling</th>
            {canViewCost && <th className="px-4 py-3 text-right font-medium">Cost</th>}
            <th className="px-4 py-3 text-left font-medium">Expiry</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductTableRow
              key={product.id}
              product={product}
              categories={categories}
              suppliers={suppliers}
              canViewCost={canViewCost}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductTableRow({
  product,
  categories,
  suppliers,
  canViewCost,
}: {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useHardDeleteProduct();

  const category = categories.find((c) => c.id === product.categoryId);
  const isLowStock = product.currentStock <= product.lowStockThreshold;
  const isOutOfStock = product.currentStock === 0;

  const copySku = () => {
    navigator.clipboard.writeText(product.sku);
    toast.success('SKU copied');
  };

  return (
    <>
      <tr
        className={`border-border hover:bg-muted/50 border-b transition-colors ${
          isOutOfStock ? 'bg-destructive/5' : isLowStock ? 'bg-amber-500/5' : ''
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{product.name}</span>
            {isOutOfStock && (
              <Badge variant="destructive" className="text-[10px]">
                Out of Stock
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge variant="warning" className="text-[10px]">
                Low Stock
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={copySku}
            className="text-muted-foreground bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs transition-colors"
            title="Copy SKU"
          >
            {product.sku}
            <Copy className="h-3 w-3" />
          </button>
        </td>
        <td className="text-muted-foreground px-4 py-3">{category?.name ?? '—'}</td>
        <td className={`px-4 py-3 text-right font-medium ${isLowStock ? 'text-destructive' : ''}`}>
          {product.currentStock}
        </td>
        <td className="text-muted-foreground px-4 py-3">{product.unit}</td>
        <td className="px-4 py-3 text-right font-medium">{fmt(product.sellingPrice)}</td>
        {canViewCost && (
          <td className="text-muted-foreground px-4 py-3 text-right">{fmt(product.costPrice)}</td>
        )}
        <td className="px-4 py-3">
          {product.expiryDate ? (
            <span
              className={`text-xs ${
                new Date(product.expiryDate) < new Date() ? 'text-destructive' : 'text-amber-600'
              }`}
            >
              {new Date(product.expiryDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setEditOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
              aria-label="Edit product"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setConfirmArchive(true);
                setConfirmOpen(true);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
              aria-label="Archive product"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setConfirmArchive(false);
                setConfirmOpen(true);
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
              aria-label="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      <ConfirmDialog
        key={`${product.id}-${confirmArchive ? 'archive' : 'delete'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (confirmArchive) await archiveProduct.mutateAsync(product.id);
          else await deleteProduct.mutateAsync(product.id);
        }}
        title={confirmArchive ? 'Archive Product' : 'Delete Product'}
        description={
          confirmArchive
            ? `Archive "${product.name}" (${product.sku})? It will be hidden from lists.`
            : `Permanently delete "${product.name}" (${product.sku})? This removes the product and all its serialized items.`
        }
        variant={confirmArchive ? 'warning' : 'destructive'}
        confirmLabel={confirmArchive ? 'Archive' : 'Delete'}
        loading={archiveProduct.isPending || deleteProduct.isPending}
      />
      {editOpen && (
        <EditProductDialog
          product={product}
          categories={categories}
          suppliers={suppliers}
          canViewCost={canViewCost}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

function ProductCard({
  product,
  categories,
  suppliers,
  canViewCost,
}: {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useHardDeleteProduct();
  const [expanded, setExpanded] = useState(false);

  const category = categories.find((c) => c.id === product.categoryId);
  const isLowStock = product.currentStock <= product.lowStockThreshold;
  const isOutOfStock = product.currentStock === 0;

  const copySku = () => {
    navigator.clipboard.writeText(product.sku);
    toast.success('SKU copied');
  };
  const copyId = () => {
    navigator.clipboard.writeText(product.id);
    toast.success('Product ID copied');
  };

  return (
    <>
      <Card
        className={`relative overflow-hidden transition-all duration-150 hover:shadow-md ${
          isOutOfStock
            ? 'border-destructive/40'
            : isLowStock
              ? 'border-amber-300 dark:border-amber-800'
              : ''
        }`}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                isOutOfStock
                  ? 'bg-red-500/10 text-red-600'
                  : isLowStock
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-gradient-to-br from-blue-500/15 to-sky-500/15 text-blue-600'
              }`}
            >
              {product.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="truncate text-[15px] font-semibold">{product.name}</h3>
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-[10px]">
                    Out of Stock
                  </Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge variant="warning" className="text-[10px]">
                    <AlertTriangle className="mr-0.5 h-3 w-3" />
                    Low Stock
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <button
                  onClick={copySku}
                  className="text-muted-foreground bg-muted hover:bg-muted/80 flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs transition-colors"
                  title="Copy SKU"
                >
                  {product.sku} <Copy className="h-3 w-3" />
                </button>
                <span className="text-muted-foreground">{category?.name ?? '-'}</span>
                <span>
                  Stock:{' '}
                  <strong className={isLowStock ? 'text-destructive' : ''}>
                    {product.currentStock}
                  </strong>
                </span>
                <span>Unit: {product.unit}</span>
                <span>
                  Selling: <strong>{fmt(product.sellingPrice)}</strong>
                </span>
                {canViewCost && (
                  <span>
                    Cost: <strong>{fmt(product.costPrice)}</strong>
                  </span>
                )}
                {product.expiryDate && (
                  <span
                    className={`text-xs ${new Date(product.expiryDate) < new Date() ? 'text-destructive' : 'text-amber-600'}`}
                  >
                    Exp:{' '}
                    {new Date(product.expiryDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">{timeAgo(product.createdAt)}</span>
              </div>
              {category && category.attributeSchema.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {category.attributeSchema.map((attr) => {
                    const val = product.attributeValues[attr.key];
                    return val !== undefined && val !== '' ? (
                      <span
                        key={attr.key}
                        className="bg-muted/70 rounded-md px-2 py-0.5 text-[11px]"
                      >
                        {String(attr.label)}: <span className="font-medium">{String(val)}</span>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-muted-foreground mt-4 space-y-1 border-t pt-3 text-xs"
                >
                  {product.notes && <p>Notes: {product.notes}</p>}
                  {product.supplierId && <p>Supplier ID: {product.supplierId}</p>}
                  <p>Created: {new Date(product.createdAt).toLocaleString('en-IN')}</p>
                  <p>Updated: {new Date(product.updatedAt).toLocaleString('en-IN')}</p>
                  <button
                    onClick={copyId}
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copy Product ID
                  </button>
                </motion.div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setEditOpen(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Edit product"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setConfirmArchive(true);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Archive product"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setConfirmArchive(false);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
                aria-label="Delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        key={`${product.id}-${confirmArchive ? 'archive' : 'delete'}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={async () => {
          if (confirmArchive) await archiveProduct.mutateAsync(product.id);
          else await deleteProduct.mutateAsync(product.id);
        }}
        title={confirmArchive ? 'Archive Product' : 'Delete Product'}
        description={
          confirmArchive
            ? `Archive "${product.name}" (${product.sku})? It will be hidden from lists.`
            : `Permanently delete "${product.name}" (${product.sku})? This removes the product and all its serialized items.`
        }
        variant={confirmArchive ? 'warning' : 'destructive'}
        confirmLabel={confirmArchive ? 'Archive' : 'Delete'}
        loading={archiveProduct.isPending || deleteProduct.isPending}
      />
      {editOpen && (
        <EditProductDialog
          product={product}
          categories={categories}
          suppliers={suppliers}
          canViewCost={canViewCost}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

function ProductNameSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [pickingNew, setPickingNew] = useState(false);
  const isCustom = value !== '' && !options.includes(value);
  const showInput = pickingNew || isCustom;

  return (
    <div className="space-y-2">
      <select
        value={showInput ? '__new__' : value}
        onChange={(e) => {
          if (e.target.value === '__new__') {
            setPickingNew(true);
            onChange('');
          } else {
            setPickingNew(false);
            onChange(e.target.value);
          }
        }}
        className="bg-background h-10 w-full rounded-md border px-3 text-sm"
      >
        <option value="" disabled>
          Select a name...
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="__new__">New…</option>
      </select>
      {showInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a new product name..."
        />
      )}
    </div>
  );
}

function CreateProductDialog({
  categories,
  suppliers,
  canViewCost,
}: {
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
}) {
  const createProduct = useCreateProduct();
  const addSupplier = useCreateSupplier();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState('');
  const [name, setName] = useState('');
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [unit, setUnit] = useState('piece');
  const [threshold, setThreshold] = useState('5');
  const [supplierId, setSupplierId] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const authOrgId = useAuthStore((s) => s.session?.orgId ?? '');
  const newSupplierLookup = useSupplierByPhone(authOrgId, newSupplierPhone);

  useEffect(() => {
    const existing = newSupplierLookup.data;
    if (existing && !newSupplierName.trim()) setNewSupplierName(existing.name);
  }, [newSupplierLookup.data, newSupplierName]);

  const category = useMemo(() => categories.find((c) => c.id === catId), [catId, categories]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!catId) errors.push('Category is required');
    if (!name.trim()) errors.push('Product name is required');
    const sp = Number(sellingPrice);
    if (sp <= 0) errors.push('Selling price must be positive');
    if (!unit) errors.push('Unit is required');
    if (category?.hasExpiry && !expiryDate)
      errors.push('Expiry date is required for this category');
    if (category) {
      for (const attr of category.attributeSchema) {
        if (attr.required && (!attrs[attr.key] || attrs[attr.key] === ''))
          errors.push(`"${attr.label}" is required`);
        if (attr.type === 'number' && attrs[attr.key] && isNaN(Number(attrs[attr.key])))
          errors.push(`"${attr.label}" must be a number`);
      }
    }
    return errors;
  }, [catId, name, sellingPrice, unit, expiryDate, category, attrs]);
  const canSubmit = validation.length === 0 && catId && name.trim();

  const handleSubmit = async () => {
    const attributeValues: Record<string, unknown> = {};
    for (const key of Object.keys(attrs)) {
      attributeValues[key] = attrs[key];
    }
    const result = await createProduct.mutateAsync({
      categoryId: catId,
      name: name.trim(),
      attributeValues,
      costPrice: canViewCost ? Number(costPrice) || 0 : 0,
      sellingPrice: Number(sellingPrice),
      unit,
      lowStockThreshold: Number(threshold) || 5,
      initialStock: Number(initialStock) || 0,
      supplierId: supplierId || undefined,
      expiryDate: expiryDate || undefined,
    });
    if (!result.success) return;
    const trimmedName = name.trim();
    if (trimmedName && category && !(category.productNames ?? []).includes(trimmedName)) {
      queryClient.setQueryData<Category[]>(['categories', authOrgId], (old) =>
        old?.map((c) =>
          c.id === catId ? { ...c, productNames: [...(c.productNames ?? []), trimmedName] } : c,
        ),
      );
      void categoryRepository
        .update(catId, {
          productNames: [...(category.productNames ?? []), trimmedName],
        })
        .catch(() => {});
    }
    setOpen(false);
    setCatId('');
    setName('');
    setAttrs({});
    setCostPrice('');
    setSellingPrice('');
    setUnit('piece');
    setThreshold('5');
    setSupplierId('');
    setShowAddSupplier(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
    setExpiryDate('');
    setDirty(false);
  };

  const handleClose = () => {
    if (dirty) setDiscardOpen(true);
    else setOpen(false);
  };

  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Product
      </Button>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-prod-title"
    >
      <div
        className="bg-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b p-4">
          <h2 id="create-prod-title" className="text-lg font-semibold">
            Add Product
          </h2>
          <button onClick={handleClose} className="hover:bg-muted rounded p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <Field
            label="Category"
            required
            tooltip="Every product must belong to a category for SKU generation and organization"
            id="prod-cat"
          >
            <select
              id="prod-cat"
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                setAttrs({});
                setDirty(true);
              }}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.codePrefix})
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Product Name"
            required
            tooltip="Pick a predefined name or choose New to add one"
            id="prod-name"
          >
            <ProductNameSelector
              options={category?.productNames ?? []}
              value={name}
              onChange={(v) => {
                setName(v);
                setDirty(true);
              }}
            />
          </Field>
          {category &&
            category.attributeSchema.map((attr) => (
              <Field
                key={attr.key}
                label={attr.label}
                required={attr.required}
                tooltip={`Custom attribute defined by the "${category.name}" category`}
                id={`attr-${attr.key}`}
              >
                {attr.type === 'select' ? (
                  <select
                    value={attrs[attr.key] ?? ''}
                    onChange={(e) => {
                      setAttrs({ ...attrs, [attr.key]: e.target.value });
                      setDirty(true);
                    }}
                    className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    {(attr.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={attr.type === 'number' ? 'number' : 'text'}
                    value={attrs[attr.key] ?? ''}
                    onChange={(e) => {
                      setAttrs({ ...attrs, [attr.key]: e.target.value });
                      setDirty(true);
                    }}
                    placeholder={attr.label}
                  />
                )}
              </Field>
            ))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {canViewCost && (
              <Field
                label="Cost Price"
                tooltip="Purchase cost per unit. Only owners can view or set this."
                id="prod-cost"
              >
                <Input
                  id="prod-cost"
                  type="text"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => {
                    setCostPrice(e.target.value.replace(/[^0-9.]/g, ''));
                    setDirty(true);
                  }}
                  placeholder="0.00"
                />
              </Field>
            )}
            <Field
              label="Selling Price"
              required
              tooltip="Required for POS billing and profit calculation"
              id="prod-selling"
            >
              <Input
                id="prod-selling"
                type="text"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => {
                  setSellingPrice(e.target.value.replace(/[^0-9.]/g, ''));
                  setDirty(true);
                }}
                placeholder="0.00"
              />
            </Field>
            <Field label="Unit" required tooltip="Measurement unit for this product" id="prod-unit">
              <select
                id="prod-unit"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setDirty(true);
                }}
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Initial Stock"
              tooltip="Starting stock level for this product"
              id="prod-initial-stock"
            >
              <Input
                id="prod-initial-stock"
                type="text"
                inputMode="numeric"
                value={initialStock}
                onChange={(e) => {
                  setInitialStock(e.target.value.replace(/\D/g, ''));
                  setDirty(true);
                }}
                placeholder="0"
              />
            </Field>
            <Field
              label="Low Stock Threshold"
              tooltip="Alert when stock falls below this number"
              id="prod-threshold"
            >
              <Input
                id="prod-threshold"
                type="text"
                inputMode="numeric"
                value={threshold}
                onChange={(e) => {
                  setThreshold(e.target.value.replace(/\D/g, ''));
                  setDirty(true);
                }}
                placeholder="5"
              />
            </Field>
            {category?.hasExpiry && (
              <Field
                label="Expiry Date"
                required
                tooltip="Required because this category tracks expiry"
                id="prod-expiry"
              >
                <Input
                  id="prod-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            )}
          </div>
          <Field label="Supplier" tooltip="Preferred supplier for this product" id="prod-supplier">
            <div className="flex gap-2">
              <select
                id="prod-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setDirty(true);
                }}
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowAddSupplier(true)}
                title="Add new supplier"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {showAddSupplier && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full text-sm sm:w-32"
                />
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Supplier name"
                  className="min-w-[140px] flex-1 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!newSupplierName.trim() || addSupplier.isPending}
                  onClick={async () => {
                    const r = await addSupplier.mutateAsync({
                      name: newSupplierName.trim(),
                      contactPhone: newSupplierPhone.trim() || undefined,
                    });
                    if (r.success) {
                      setSupplierId(r.value.id);
                      setShowAddSupplier(false);
                      setNewSupplierName('');
                      setNewSupplierPhone('');
                    }
                  }}
                >
                  {addSupplier.isPending ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddSupplier(false);
                    setNewSupplierName('');
                    setNewSupplierPhone('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
            {showAddSupplier &&
              newSupplierLookup.isFetching &&
              newSupplierPhone.trim().length >= 10 && (
                <p className="text-muted-foreground mt-1 text-xs">Looking up phone number…</p>
              )}
            {showAddSupplier && newSupplierLookup.data && (
              <p className="bg-muted text-muted-foreground mt-1 rounded-md px-2.5 py-1.5 text-xs">
                Existing supplier found — name filled automatically.
              </p>
            )}
          </Field>
          {validation.length > 0 && (
            <div className="bg-destructive/5 border-destructive/20 space-y-1 rounded-md border p-3">
              {validation.map((err, i) => (
                <p key={i} className="text-destructive flex items-center gap-1 text-xs">
                  <X className="h-3 w-3 shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || createProduct.isPending}
          >
            {createProduct.isPending ? 'Creating...' : 'Add Product'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => setOpen(false)}
        title="Discard changes?"
        description="You have unsaved changes. They will be lost if you close this dialog."
        confirmLabel="Discard"
        variant="warning"
        icon={AlertTriangle}
      />
    </div>
  );
}

function EditProductDialog({
  product,
  categories,
  suppliers,
  canViewCost,
  onOpenChange,
}: {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();
  const authOrgId = useAuthStore((s) => s.session?.orgId ?? '');
  const [catId, setCatId] = useState(product.categoryId);
  const [name, setName] = useState(product.name);
  const [attrs, setAttrs] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(product.attributeValues ?? {}).map(([k, v]) => [k, String(v)]),
    ),
  );
  const [costPrice, setCostPrice] = useState(String(product.costPrice || ''));
  const [sellingPrice, setSellingPrice] = useState(String(product.sellingPrice || ''));
  const [unit, setUnit] = useState(product.unit);
  const [threshold, setThreshold] = useState(String(product.lowStockThreshold || ''));
  const [supplierId, setSupplierId] = useState(product.supplierId ?? '');
  const [expiryDate, setExpiryDate] = useState(
    product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
  );
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const category = categories.find((c) => c.id === catId);

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
      queryClient.setQueryData<Category[]>(['categories', authOrgId], (old) =>
        old?.map((c) =>
          c.id === catId ? { ...c, productNames: [...(c.productNames ?? []), trimmedName] } : c,
        ),
      );
      void categoryRepository
        .update(catId, {
          productNames: [...(category.productNames ?? []), trimmedName],
        })
        .catch(() => {});
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    if (dirty) setDiscardOpen(true);
    else onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-prod-title"
    >
      <div
        className="bg-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b p-4">
          <h2 id="edit-prod-title" className="text-lg font-semibold">
            Edit Product
          </h2>
          <button onClick={handleClose} className="hover:bg-muted rounded p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <Field
            label="Category"
            required
            tooltip="Every product must belong to a category for SKU generation and organization"
            id="edit-prod-cat"
          >
            <select
              id="edit-prod-cat"
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                setAttrs({});
                setDirty(true);
              }}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.codePrefix})
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Product Name"
            required
            tooltip="Pick a predefined name or choose New to add one"
            id="edit-prod-name"
          >
            <ProductNameSelector
              options={category?.productNames ?? []}
              value={name}
              onChange={(v) => {
                setName(v);
                setDirty(true);
              }}
            />
          </Field>
          {category &&
            category.attributeSchema.map((attr) => (
              <Field
                key={attr.key}
                label={attr.label}
                required={attr.required}
                tooltip={`Custom attribute defined by the "${category.name}" category`}
                id={`edit-attr-${attr.key}`}
              >
                {attr.type === 'select' ? (
                  <select
                    value={attrs[attr.key] ?? ''}
                    onChange={(e) => {
                      setAttrs({ ...attrs, [attr.key]: e.target.value });
                      setDirty(true);
                    }}
                    className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    {(attr.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={attr.type === 'number' ? 'number' : 'text'}
                    value={attrs[attr.key] ?? ''}
                    onChange={(e) => {
                      setAttrs({ ...attrs, [attr.key]: e.target.value });
                      setDirty(true);
                    }}
                    placeholder={attr.label}
                  />
                )}
              </Field>
            ))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {canViewCost && (
              <Field
                label="Cost Price"
                tooltip="Purchase cost per unit. Only owners can view or set this."
                id="edit-prod-cost"
              >
                <Input
                  id="edit-prod-cost"
                  type="text"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => {
                    setCostPrice(e.target.value.replace(/[^0-9.]/g, ''));
                    setDirty(true);
                  }}
                  placeholder="0.00"
                />
              </Field>
            )}
            <Field
              label="Selling Price"
              required
              tooltip="Required for POS billing and profit calculation"
              id="edit-prod-selling"
            >
              <Input
                id="edit-prod-selling"
                type="text"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => {
                  setSellingPrice(e.target.value.replace(/[^0-9.]/g, ''));
                  setDirty(true);
                }}
                placeholder="0.00"
              />
            </Field>
            <Field
              label="Unit"
              required
              tooltip="Measurement unit for this product"
              id="edit-prod-unit"
            >
              <select
                id="edit-prod-unit"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setDirty(true);
                }}
                className="bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Low Stock Threshold"
              tooltip="Alert when stock falls below this number"
              id="edit-prod-threshold"
            >
              <Input
                id="edit-prod-threshold"
                type="text"
                inputMode="numeric"
                value={threshold}
                onChange={(e) => {
                  setThreshold(e.target.value.replace(/\D/g, ''));
                  setDirty(true);
                }}
                placeholder="5"
              />
            </Field>
            {category?.hasExpiry && (
              <Field
                label="Expiry Date"
                tooltip="Expiry date for this product"
                id="edit-prod-expiry"
              >
                <Input
                  id="edit-prod-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            )}
          </div>
          <Field
            label="Supplier"
            tooltip="Preferred supplier for this product"
            id="edit-prod-supplier"
          >
            <select
              id="edit-prod-supplier"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setDirty(true);
              }}
              className="bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || updateProduct.isPending}
          >
            {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => onOpenChange(false)}
        title="Discard changes?"
        description="You have unsaved changes. They will be lost if you close this dialog."
        confirmLabel="Discard"
        variant="warning"
        icon={AlertTriangle}
      />
    </div>
  );
}

/* ────── INVENTORY ────── */

function StockLedgerView({
  products,
  selectedProductId,
  onSelectProduct,
}: {
  products: Product[];
  categories: Category[];
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
}) {
  const movementsQ = useStockMovements(selectedProductId ?? '');
  const movements: StockMovement[] = useMemo(() => movementsQ.data ?? [], [movementsQ.data]);
  const serializedItemsQ = useSerializedItems(selectedProductId ?? '');
  const allSerials: SerializedItem[] = useMemo(
    () => serializedItemsQ.data ?? [],
    [serializedItemsQ.data],
  );
  const createSerials = useCreateSerializedItems();
  const restockSerials = useRestockSerializedItems();

  const [mFilter, setMFilter] = useState<'ALL' | 'IN' | 'OUT' | 'SALE'>('ALL');
  const [movementPage, setMovementPage] = useState(0);
  const product = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

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
      mFilter === 'IN'
        ? ['RESTOCK_IN']
        : mFilter === 'OUT'
          ? ['MANUAL_OUT']
          : ['POS_SALE', 'VEHICLE_TASK_USE'];
    return movements.filter((m) => match.includes(m.type));
  }, [movements, mFilter]);

  const MOVEMENT_PAGE_SIZE = 5;
  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENT_PAGE_SIZE));
  const safeMovementPage = Math.min(movementPage, movementTotalPages - 1);
  const pagedMovements = [...filteredMovements]
    .reverse()
    .slice(safeMovementPage * MOVEMENT_PAGE_SIZE, (safeMovementPage + 1) * MOVEMENT_PAGE_SIZE);

  const SERIAL_PAGE_SIZE = 5;
  const serialTotalPages = Math.max(1, Math.ceil(allSerials.length / SERIAL_PAGE_SIZE));
  const safeSerialPage = Math.min(serialPage, serialTotalPages);
  const paginatedSerials = useMemo(
    () =>
      [...allSerials]
        .reverse()
        .slice((safeSerialPage - 1) * SERIAL_PAGE_SIZE, safeSerialPage * SERIAL_PAGE_SIZE),
    [allSerials, safeSerialPage],
  );

  const handleAddSerialNumber = async () => {
    if (!selectedProductId || !product || addingSerial) return;
    const serials = [
      ...new Set(
        serialInput
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    if (serials.length === 0) {
      toast.error('Enter at least one serial number');
      return;
    }
    const existing = serials.filter((s) => allSerials.some((item) => item.serialNumber === s));
    if (existing.length > 0) {
      toast.error(`Serial already exists: ${existing.join(', ')}`);
      return;
    }
    setAddingSerial(true);
    try {
      const result = await restockSerials.mutateAsync({
        productId: selectedProductId,
        serialNumbers: serials,
      });
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Product list */}
      <div className="bg-card space-y-2 self-start rounded-xl border p-3 shadow-sm lg:col-span-1">
        <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <Package className="h-3.5 w-3.5" />
          Products
        </h3>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label="Search stock products"
          />
        </div>
        <div
          className="max-h-[65vh] space-y-1 overflow-y-auto"
          role="listbox"
          aria-label="Product list"
        >
          {products
            .filter(
              (p) =>
                !searchTerm ||
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((p) => (
              <button
                key={p.id}
                role="option"
                aria-selected={selectedProductId === p.id}
                onClick={() => {
                  onSelectProduct(p.id);
                  setMFilter('ALL');
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${selectedProductId === p.id ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
              >
                <span
                  className={`block font-mono text-xs ${selectedProductId === p.id ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  {p.sku}
                </span>
                <span className="font-medium">{p.name}</span>
                <span
                  className={`block text-xs ${p.currentStock <= p.lowStockThreshold && selectedProductId !== p.id ? 'text-destructive' : selectedProductId === p.id ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  Stock: {p.currentStock}{' '}
                  {p.currentStock <= p.lowStockThreshold && (
                    <AlertTriangle className="inline h-3 w-3" />
                  )}
                </span>
              </button>
            ))}
        </div>
      </div>
      {/* Stock details */}
      <div className="space-y-6 lg:col-span-2">
        {product ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{product.name}</span>
                      <span className="text-muted-foreground shrink-0 font-mono text-sm font-normal">
                        ({product.sku})
                      </span>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Current Stock
                    </p>
                    <p
                      className={`mt-0.5 text-3xl font-bold ${currentStock <= product.lowStockThreshold ? 'text-destructive' : 'text-blue-600'}`}
                    >
                      {currentStock}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl border p-3">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Threshold
                    </p>
                    <p className="text-foreground mt-0.5 text-2xl font-semibold">
                      {product.lowStockThreshold}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl border p-3">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Unit
                    </p>
                    <p className="text-foreground mt-0.5 text-2xl font-semibold">{product.unit}</p>
                  </div>
                  <div className="bg-card rounded-xl border p-3">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Total Movements
                    </p>
                    <p className="text-foreground mt-0.5 text-2xl font-semibold">
                      {movements.length}
                    </p>
                  </div>
                </div>
                {currentStock <= product.lowStockThreshold && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
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
                  <span className="text-muted-foreground text-sm">
                    {allSerials.filter((s) => s.isAvailable).length} in stock / {allSerials.length}{' '}
                    total
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSerialNumber();
                      }
                    }}
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
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : allSerials.length === 0 && currentStock > 0 ? (
                  <div className="space-y-3 py-2 text-center">
                    <p className="text-muted-foreground text-sm">
                      This product has {currentStock} in stock but no serialized items yet.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateSerialsForExisting}
                      disabled={backfilling || createSerials.isPending}
                    >
                      {backfilling ? 'Generating...' : `Generate ${currentStock} Serial(s)`}
                    </Button>
                  </div>
                ) : allSerials.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No serialized items yet. Type a serial number and click + to add it.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
                      {paginatedSerials.map((s) => (
                        <div
                          key={s.id}
                          className="hover:bg-muted/30 flex items-center justify-between rounded px-2 py-2 text-sm"
                        >
                          <span className="font-mono">{s.serialNumber}</span>
                          <Badge
                            variant={s.isAvailable ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {s.isAvailable ? 'In Stock' : 'Sold/Used'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {serialTotalPages > 1 && (
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-muted-foreground text-xs">
                          Page {safeSerialPage} of {serialTotalPages} ({allSerials.length} items)
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={safeSerialPage <= 1}
                            onClick={() => setSerialPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={safeSerialPage >= serialTotalPages}
                            onClick={() => setSerialPage((p) => Math.min(serialTotalPages, p + 1))}
                            aria-label="Next page"
                          >
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
                  <div className="bg-muted/60 flex gap-1 rounded-lg p-0.5">
                    {(['ALL', 'IN', 'OUT', 'SALE'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setMFilter(t);
                          setMovementPage(0);
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${mFilter === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {movementsQ.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredMovements.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No movements recorded yet.
                  </p>
                ) : (
                  <>
                    <div className="max-h-96 space-y-1 overflow-y-auto">
                      {pagedMovements.map((m) => (
                        <div
                          key={m.id}
                          className="hover:bg-muted/30 -mx-2 flex items-center justify-between rounded-lg border-b px-2 py-3 text-sm transition-colors last:border-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                m.type === 'RESTOCK_IN'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : m.type === 'POS_SALE'
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                                    : m.type === 'VEHICLE_TASK_USE'
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              }`}
                            >
                              {m.type === 'RESTOCK_IN'
                                ? 'Restock In'
                                : m.type === 'MANUAL_OUT'
                                  ? 'Adjust Out'
                                  : m.type === 'POS_SALE'
                                    ? 'POS Sale'
                                    : 'Vehicle Task'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-muted-foreground text-xs"
                                  title={new Date(m.createdAt).toLocaleString('en-IN')}
                                >
                                  {timeAgo(m.createdAt)}
                                </span>
                              </div>
                              {m.note && m.type !== 'RESTOCK_IN' && (
                                <p
                                  className="text-muted-foreground max-w-[240px] truncate text-xs"
                                  title={m.note}
                                >
                                  {m.note}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 font-semibold ${m.type === 'RESTOCK_IN' ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              {m.type === 'RESTOCK_IN' ? '+' : '-'}
                              {m.quantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      page={safeMovementPage}
                      totalPages={movementTotalPages}
                      onPageChange={setMovementPage}
                      itemCount={filteredMovements.length}
                      itemLabel="movements"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex h-96 items-center justify-center">
            <EmptyState
              title="No product selected"
              description="Select a product from the list to view stock details and movement history."
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ────── ADJUST OUT ────── */

function AdjustOutView({
  products,
  selectedProductId,
  onSelectProduct,
}: {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const product = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Product list */}
      <div className="bg-card space-y-2 self-start rounded-xl border p-3 shadow-sm lg:col-span-1">
        <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <Package className="h-3.5 w-3.5" />
          Products
        </h3>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label="Search products to adjust"
          />
        </div>
        <div
          className="max-h-[65vh] space-y-1 overflow-y-auto"
          role="listbox"
          aria-label="Product list"
        >
          {products
            .filter(
              (p) =>
                !searchTerm ||
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((p) => (
              <button
                key={p.id}
                role="option"
                aria-selected={selectedProductId === p.id}
                onClick={() => onSelectProduct(p.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${selectedProductId === p.id ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
              >
                <span
                  className={`block font-mono text-xs ${selectedProductId === p.id ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  {p.sku}
                </span>
                <span className="font-medium">{p.name}</span>
                <span
                  className={`block text-xs ${p.currentStock <= p.lowStockThreshold && selectedProductId !== p.id ? 'text-destructive' : selectedProductId === p.id ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  Stock: {p.currentStock}
                </span>
              </button>
            ))}
        </div>
      </div>
      {/* Adjust panel */}
      <div className="space-y-6 lg:col-span-2">
        {product ? (
          <AdjustOutCard product={product} />
        ) : (
          <div className="flex h-96 items-center justify-center">
            <EmptyState
              title="No product selected"
              description="Select a product from the list to adjust stock out."
            />
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
  const availableSerials: SerializedItem[] = useMemo(
    () => availableSerialsQ.data ?? [],
    [availableSerialsQ.data],
  );

  const [adjustMode, setAdjustMode] = useState<'bulk' | 'individual'>('bulk');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState('');
  const [individualReasons, setIndividualReasons] = useState<Record<string, string>>({});

  const toggleSerial = (id: string) => {
    setSelectedSerials((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleBulkAdjustOut = async () => {
    if (selectedSerials.length === 0 || !bulkReason.trim()) return;
    const result = await recordMovement.mutateAsync({
      productId: product.id,
      type: 'MANUAL_OUT',
      quantity: selectedSerials.length,
      note: bulkReason.trim(),
      supplierId: undefined,
    });
    if (!result.success) return;
    await removeSerials.mutateAsync({ ids: selectedSerials, productId: product.id });
    setSelectedSerials([]);
    setBulkReason('');
  };

  const handleIndividualAdjustOut = async (serial: SerializedItem) => {
    const reason = (individualReasons[serial.id] ?? '').trim();
    if (!reason) return;
    const result = await recordMovement.mutateAsync({
      productId: product.id,
      type: 'MANUAL_OUT',
      quantity: 1,
      note: reason,
      supplierId: undefined,
    });
    if (!result.success) return;
    await removeSerials.mutateAsync({ ids: [serial.id], productId: product.id });
    setIndividualReasons((prev) => {
      const next = { ...prev };
      delete next[serial.id];
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <span className="truncate">{product.name}</span>
              <span className="text-muted-foreground shrink-0 font-mono text-sm font-normal">
                ({product.sku})
              </span>
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">Adjust Out</p>
          </div>
          <div className="bg-muted/60 flex shrink-0 gap-1 rounded-lg p-0.5">
            {(['bulk', 'individual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAdjustMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${adjustMode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'bulk' ? 'Bulk' : 'One by One'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Available to remove</span>
          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-sm font-semibold text-blue-600">
            {availableSerials.length}
          </span>
        </div>
        {availableSerialsQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : availableSerials.length === 0 ? (
          <p className="text-muted-foreground text-sm">No available serials to remove.</p>
        ) : adjustMode === 'bulk' ? (
          <>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border p-2">
              <p className="text-muted-foreground mb-1 px-1 text-xs">
                {selectedSerials.length > 0
                  ? `${selectedSerials.length} selected`
                  : 'Select serials to remove'}
              </p>
              {availableSerials.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    selectedSerials.includes(s.id)
                      ? 'bg-blue-50 dark:bg-blue-950/30'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSerials.includes(s.id)}
                    onChange={() => toggleSerial(s.id)}
                    className="border-muted-foreground/30 h-4 w-4 rounded accent-blue-600"
                  />
                  <span className="font-mono">{s.serialNumber}</span>
                </label>
              ))}
            </div>
            <div>
              <Field
                label="Reason"
                required
                tooltip="Applied to all selected serials"
                id="adjust-bulk-reason"
              >
                <Input
                  id="adjust-bulk-reason"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. Damaged, Lost, Returned"
                />
              </Field>
            </div>
            <Button
              onClick={handleBulkAdjustOut}
              disabled={
                recordMovement.isPending || selectedSerials.length === 0 || !bulkReason.trim()
              }
            >
              {recordMovement.isPending
                ? 'Recording...'
                : `Adjust Out ${selectedSerials.length} Item(s)`}
            </Button>
          </>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {availableSerials.map((s) => (
              <div key={s.id} className="bg-card flex items-center gap-2 rounded-xl border p-2.5">
                <span className="shrink-0 font-mono text-sm">{s.serialNumber}</span>
                <Input
                  value={individualReasons[s.id] ?? ''}
                  onChange={(e) =>
                    setIndividualReasons((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
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

function ArchivedView({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<ArchivedSubTab>('products');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const productsQ = useArchivedProducts(orgId);
  const categoriesQ = useArchivedCategories(orgId);
  const suppliersQ = useArchivedSuppliers(orgId);

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || suppliersQ.isLoading;
  const error = productsQ.error ?? categoriesQ.error ?? suppliersQ.error;
  const products = productsQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const suppliers = suppliersQ.data ?? [];
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['categories', orgId, 'archived'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers', orgId, 'archived'] });
  };

  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  if (error)
    return (
      <EmptyState
        title="Failed to load archived items"
        description={error.message}
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        }
      />
    );

  const currentItems =
    subTab === 'products' ? products : subTab === 'categories' ? categories : suppliers;
  const label =
    subTab === 'products' ? 'products' : subTab === 'categories' ? 'categories' : 'suppliers';
  const total = currentItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (total === 0)
    return (
      <EmptyState
        title={`No archived ${label}`}
        description={`Archived ${label} will appear here.`}
      />
    );

  const subTabs: { key: ArchivedSubTab; label: string; count: number }[] = [
    { key: 'products', label: 'Products', count: products.length },
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'suppliers', label: 'Suppliers', count: suppliers.length },
  ];

  const handleSubTabChange = (key: ArchivedSubTab) => {
    setSubTab(key);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card flex flex-wrap gap-1 rounded-xl border p-1.5 shadow-sm">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSubTabChange(t.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.97] ${
              subTab === t.key
                ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md shadow-blue-500/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                subTab === t.key ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {total} archived {label}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subTab === 'products' &&
          products
            .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
            .map((p) => <ArchivedProductCard key={p.id} product={p} onAction={refetch} />)}
        {subTab === 'categories' &&
          categories
            .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
            .map((c) => <ArchivedCategoryCard key={c.id} category={c} onAction={refetch} />)}
        {subTab === 'suppliers' &&
          suppliers
            .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
            .map((s) => <ArchivedSupplierCard key={s.id} supplier={s} onAction={refetch} />)}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
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
      <Card className="border-muted/50 min-w-0 opacity-80 transition-opacity hover:opacity-100">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 font-mono text-xs">
                  {product.sku}
                </span>
                <h3 className="truncate font-semibold">{product.name}</h3>
                <Badge variant="warning" className="text-[10px]">
                  Archived
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span>Stock: {product.currentStock}</span>
                <span>Selling: {fmt(product.sellingPrice)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => {
                  setIsDelete(false);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Restore product"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsDelete(true);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
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
        description={
          isDelete
            ? `Permanently delete "${product.name}" (${product.sku})? This cannot be undone.`
            : `Restore "${product.name}" (${product.sku})? It will reappear in products.`
        }
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteProduct.isPending}
      />
    </>
  );
}

function ArchivedCategoryCard({
  category,
  onAction,
}: {
  category: Category;
  onAction: () => void;
}) {
  const unarchive = useUnarchiveCategory();
  const deleteCategory = useHardDeleteCategory();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  return (
    <>
      <Card className="border-muted/50 min-w-0 opacity-80 transition-opacity hover:opacity-100">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{category.name}</h3>
                <Badge variant="warning" className="text-[10px]">
                  Archived
                </Badge>
              </div>
              {category.codePrefix && (
                <p className="text-muted-foreground mt-1 text-xs">Code: {category.codePrefix}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => {
                  setIsDelete(false);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Restore category"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsDelete(true);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
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
        description={
          isDelete
            ? `Permanently delete "${category.name}"? This cannot be undone.`
            : `Restore "${category.name}"? It will reappear in categories.`
        }
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteCategory.isPending}
      />
    </>
  );
}

function ArchivedSupplierCard({
  supplier,
  onAction,
}: {
  supplier: Supplier;
  onAction: () => void;
}) {
  const unarchive = useUnarchiveSupplier();
  const deleteSupplier = useHardDeleteSupplier();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);

  return (
    <>
      <Card className="border-muted/50 min-w-0 opacity-80 transition-opacity hover:opacity-100">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{supplier.name}</h3>
                <Badge variant="warning" className="text-[10px]">
                  Archived
                </Badge>
              </div>
              {supplier.contactPhone && (
                <p className="text-muted-foreground mt-1 text-xs">{supplier.contactPhone}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => {
                  setIsDelete(false);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5"
                aria-label="Restore supplier"
              >
                <ArchiveRestore className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsDelete(true);
                  setConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1.5"
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
        description={
          isDelete
            ? `Permanently delete "${supplier.name}"? This cannot be undone.`
            : `Restore "${supplier.name}"? It will reappear in suppliers.`
        }
        variant={isDelete ? 'destructive' : 'info'}
        confirmLabel={isDelete ? 'Delete' : 'Restore'}
        loading={unarchive.isPending || deleteSupplier.isPending}
      />
    </>
  );
}

/* ────── Field Helper ────── */

function Field({
  label,
  required,
  tooltip,
  children,
  id,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  id: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span
            className="text-destructive relative cursor-help text-sm font-bold"
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
              <span
                className="bg-popover text-popover-foreground absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded border px-2 py-1 text-xs whitespace-nowrap shadow-lg"
                role="tooltip"
              >
                {tooltip}
                <span className="border-t-popover absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" />
              </span>
            )}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
