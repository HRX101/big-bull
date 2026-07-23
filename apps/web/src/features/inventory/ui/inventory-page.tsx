'use client';

import type { InventoryCategory, InventoryItem } from '@car-spa/domain';
import { formatInventoryAttributeValue } from '@car-spa/domain';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { CategoryForm } from '@/features/inventory/ui/category-form';
import { InventoryItemForm } from '@/features/inventory/ui/inventory-item-form';
import {
  useDeleteInventoryCategory,
  useDeleteInventoryItem,
  useInventory,
  useInventoryCategories,
} from '@/hooks/use-operations';

export function InventoryPage() {
  const { session } = useAuth();
  const isOwner = session?.role === 'owner';
  const { data: categories = [], isLoading: categoriesLoading } = useInventoryCategories();
  const { data: items = [], isLoading: itemsLoading } = useInventory();
  const deleteCategory = useDeleteInventoryCategory();
  const deleteItem = useDeleteInventoryItem();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryFormMode, setCategoryFormMode] = useState<'create' | 'edit' | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    if (!selectedCategoryId || !categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]!.id);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const categoryItems = useMemo(
    () => items.filter((item) => item.categoryId === selectedCategoryId),
    [items, selectedCategoryId],
  );

  const closeCategoryForm = () => {
    setCategoryFormMode(null);
    setActionError(null);
  };

  const handleDeleteCategory = async (category: InventoryCategory) => {
    setActionError(null);
    const result = await deleteCategory.mutateAsync(category.id);
    if (!result.success) {
      setActionError(result.error?.message ?? 'Failed to delete category');
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    setActionError(null);
    const result = await deleteItem.mutateAsync(item.id);
    if (!result.success) {
      setActionError(result.error?.message ?? 'Failed to delete item');
    }
  };

  const tableHeaders = selectedCategory
    ? [
        'SKU',
        ...selectedCategory.fields.map((field) => field.label),
        'Qty',
        'Unit price (₹)',
        'Low stock at',
        'Status',
        'Actions',
      ]
    : [];

  const tableRows = categoryItems.map((item) => [
    item.sku,
    ...selectedCategory!.fields.map((field) =>
      formatInventoryAttributeValue(field, item.attributes[field.key]),
    ),
    String(item.quantity),
    `₹${item.unitPrice.toFixed(2)}`,
    String(item.reorderLevel),
    item.quantity <= item.reorderLevel ? (
      <Badge variant="warning">Low stock</Badge>
    ) : (
      <Badge variant="success">OK</Badge>
    ),
    <div key={`${item.id}-actions`} className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setEditingItem(item);
          setShowItemForm(true);
          setCategoryFormMode(null);
        }}
      >
        Edit
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteItem(item)}>
        Delete
      </Button>
    </div>,
  ]);

  const isLoading = categoriesLoading || itemsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Create custom categories and manage stock with category-specific fields."
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryFormMode((mode) => (mode === 'create' ? null : 'create'));
                  setShowItemForm(false);
                  setEditingItem(null);
                }}
              >
                {categoryFormMode === 'create' ? 'Cancel category' : 'Create category'}
              </Button>
            )}
            {isOwner && selectedCategory && (
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryFormMode((mode) => (mode === 'edit' ? null : 'edit'));
                  setShowItemForm(false);
                  setEditingItem(null);
                }}
              >
                {categoryFormMode === 'edit' ? 'Cancel edit' : 'Edit category'}
              </Button>
            )}
            <Button
              disabled={!selectedCategory}
              onClick={() => {
                setEditingItem(null);
                setShowItemForm((value) => !value);
                setCategoryFormMode(null);
              }}
            >
              {showItemForm && !editingItem ? 'Cancel item' : 'Add item'}
            </Button>
          </div>
        }
      />

      {categoryFormMode === 'create' && (
        <CategoryForm onSuccess={closeCategoryForm} onCancel={closeCategoryForm} />
      )}

      {categoryFormMode === 'edit' && selectedCategory && (
        <CategoryForm
          key={selectedCategory.id}
          category={selectedCategory}
          onSuccess={closeCategoryForm}
          onCancel={closeCategoryForm}
        />
      )}

      {showItemForm && selectedCategory && (
        <InventoryItemForm
          key={editingItem?.id ?? selectedCategory.id}
          category={selectedCategory}
          initialValues={
            editingItem
              ? {
                  id: editingItem.id,
                  sku: editingItem.sku,
                  quantity: editingItem.quantity,
                  unitPrice: editingItem.unitPrice,
                  reorderLevel: editingItem.reorderLevel,
                  attributes: editingItem.attributes,
                }
              : undefined
          }
          onSuccess={() => {
            setShowItemForm(false);
            setEditingItem(null);
            setActionError(null);
          }}
        />
      )}

      {actionError && <p className="text-destructive text-sm">{actionError}</p>}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {categories.length === 0 && !categoriesLoading ? (
        <div className="border-border/60 rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No categories yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Define a category and the custom fields your products need.
          </p>
          {isOwner && (
            <Button className="mt-4" onClick={() => setCategoryFormMode('create')}>
              Create your first category
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={category.id === selectedCategoryId ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setEditingItem(null);
                    setShowItemForm(false);
                    setCategoryFormMode(null);
                  }}
                >
                  {category.name}
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({items.filter((item) => item.categoryId === category.id).length})
                  </span>
                </Button>
                {isOwner && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={deleteCategory.isPending}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          {selectedCategory && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {selectedCategory.fields.map((field) => (
                  <Badge key={field.key} variant="success">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </Badge>
                ))}
              </div>

              <DataTable
                headers={tableHeaders}
                rows={tableRows}
                emptyMessage={`No ${selectedCategory.name.toLowerCase()} items yet. Add one to see it here.`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
