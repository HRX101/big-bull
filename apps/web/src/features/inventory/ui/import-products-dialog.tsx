'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import type { Category, Product, Supplier } from '@car-spa/domain';
import { hasPermission } from '@car-spa/shared';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  buildImportReviewRows,
  downloadImportTemplate,
  importProductRows,
  parseExcelFile,
  type ImportProgressRow,
  type ImportReviewRow,
} from '../lib/import-products';

type Step = 'upload' | 'review' | 'importing' | 'complete';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
}

function statusBadge(status: ImportReviewRow['status']) {
  if (status === 'valid')
    return <Badge className="bg-emerald-500/15 text-emerald-700">Valid</Badge>;
  if (status === 'warning')
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Review
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Error
    </Badge>
  );
}

export function ImportProductsDialog({
  categories,
  suppliers,
  canViewCost,
}: {
  categories: Category[];
  suppliers: Supplier[];
  canViewCost: boolean;
}) {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.session?.orgId ?? '');
  const userId = useAuthStore((s) => s.session?.userId ?? '');
  const role = useAuthStore((s) => s.session?.role ?? 'employee');
  const canCreateSupplier = hasPermission(role, 'supplier:create');

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [reviewRows, setReviewRows] = useState<ImportReviewRow[]>([]);
  const [progressRows, setProgressRows] = useState<ImportProgressRow[]>([]);
  const [importedProducts, setImportedProducts] = useState<Product[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const valid = reviewRows.filter((r) => r.status === 'valid').length;
    const warning = reviewRows.filter((r) => r.status === 'warning').length;
    const error = reviewRows.filter((r) => r.status === 'error').length;
    return { valid, warning, error, total: reviewRows.length };
  }, [reviewRows]);

  const canConfirmImport = stats.error === 0 && stats.total > 0;

  const reset = () => {
    setStep('upload');
    setFileName('');
    setReviewRows([]);
    setProgressRows([]);
    setImportedProducts([]);
    setFailedCount(0);
    setDirty(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (dirty && step !== 'complete') setDiscardOpen(true);
    else {
      setOpen(false);
      reset();
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = await parseExcelFile(buffer);
      const mapped = buildImportReviewRows(parsedRows, categories, suppliers, {
        canViewCost,
        canCreateSupplier,
      });
      setFileName(file.name);
      setReviewRows(mapped);
      setStep('review');
      setDirty(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse Excel file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!orgId || !userId || !canConfirmImport) return;

    setStep('importing');
    const initialProgress: ImportProgressRow[] = reviewRows.map((row) => ({
      ...row,
      importStatus: 'pending',
    }));
    setProgressRows(initialProgress);

    const importableRows = reviewRows.filter((row) => row.status !== 'error');
    const { imported, failed } = await importProductRows(importableRows, {
      orgId,
      userId,
      canViewCost,
      canCreateSupplier,
      categories: [...categories],
      suppliers: [...suppliers],
      delayMs: 180,
      onProgress: (row) => {
        setProgressRows((current) => {
          const index = current.findIndex((r) => r.rowIndex === row.rowIndex);
          if (index === -1) return current;
          const next = [...current];
          next[index] = row;
          return next;
        });
      },
    });

    if (imported.length > 0) {
      qc.setQueryData<Product[]>(['products', orgId], (old) => {
        const merged = [...imported, ...(old ?? [])];
        return merged;
      });
      qc.invalidateQueries({ queryKey: ['categories', orgId] });
      qc.invalidateQueries({ queryKey: ['suppliers', orgId] });
    }

    setImportedProducts(imported);
    setFailedCount(failed.length);
    setStep('complete');

    if (imported.length > 0 && failed.length === 0) {
      toast.success(`Imported ${imported.length} product${imported.length === 1 ? '' : 's'}`);
    } else if (imported.length > 0) {
      toast.warning(`Imported ${imported.length}, ${failed.length} failed`);
    } else {
      toast.error('Import failed — no products were created');
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md shadow-blue-500/30 hover:from-blue-600 hover:to-sky-600"
      >
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-products-title"
      >
        <div
          className="bg-background flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="from-primary/10 border-b bg-gradient-to-r to-sky-500/10 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                  Inventory Import
                </p>
                <h2 id="import-products-title" className="text-xl font-semibold">
                  Import from Excel
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Upload, review mapped rows, then confirm to populate inventory.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="hover:bg-muted rounded-lg p-2"
                aria-label="Close import dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {(['upload', 'review', 'importing'] as const).map((key, index) => {
                const labels = { upload: 'Upload', review: 'Review', importing: 'Confirm' };
                const active = step === key || (step === 'complete' && key === 'importing');
                const done =
                  (step === 'review' && key === 'upload') ||
                  (step === 'importing' && (key === 'upload' || key === 'review')) ||
                  (step === 'complete' && key !== 'importing');
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 font-medium ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : done
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}. {labels[key]}
                    </span>
                    {index < 2 && <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  className="border-border hover:border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                >
                  {isParsing ? (
                    <Loader2 className="text-primary h-10 w-10 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="text-primary h-10 w-10" />
                  )}
                  <p className="mt-4 text-lg font-medium">
                    {isParsing ? 'Reading Excel file…' : 'Drop your Excel file here'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    or click to browse (.xlsx, .xls)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                    }}
                  />
                </div>

                <div className="bg-muted/40 rounded-xl border p-4">
                  <p className="text-sm font-medium">Required columns</p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Category, Product Name, Cost Price, Selling Price, Unit, Initial Stock, Low
                    Stock Threshold, Supplier
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => downloadImportTemplate()}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download template
                  </Button>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">{fileName}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700">{stats.valid} valid</Badge>
                  {stats.warning > 0 && <Badge variant="warning">{stats.warning} to review</Badge>}
                  {stats.error > 0 && <Badge variant="destructive">{stats.error} errors</Badge>}
                </div>

                <div className="border-border overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-border border-b">
                        <th className="px-3 py-3 text-left font-medium">Row</th>
                        <th className="px-3 py-3 text-left font-medium">Status</th>
                        <th className="px-3 py-3 text-left font-medium">Category</th>
                        <th className="px-3 py-3 text-left font-medium">Product</th>
                        <th className="px-3 py-3 text-right font-medium">Cost</th>
                        <th className="px-3 py-3 text-right font-medium">Selling</th>
                        <th className="px-3 py-3 text-left font-medium">Unit</th>
                        <th className="px-3 py-3 text-right font-medium">Stock</th>
                        <th className="px-3 py-3 text-right font-medium">Threshold</th>
                        <th className="px-3 py-3 text-left font-medium">Supplier</th>
                        <th className="px-3 py-3 text-left font-medium">Mapping</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRows.map((row, index) => (
                        <motion.tr
                          key={row.rowIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-border hover:bg-muted/30 border-b"
                        >
                          <td className="text-muted-foreground px-3 py-3">{row.rowIndex}</td>
                          <td className="px-3 py-3">{statusBadge(row.status)}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{row.category || '—'}</div>
                            <div className="text-muted-foreground text-xs">
                              {row.categoryAction === 'create' ? 'Will create' : 'Existing'}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-medium">{row.productName || '—'}</td>
                          <td className="px-3 py-3 text-right">
                            {canViewCost ? fmt(row.costPrice) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right">{fmt(row.sellingPrice)}</td>
                          <td className="px-3 py-3">{row.unit}</td>
                          <td className="px-3 py-3 text-right">{row.initialStock}</td>
                          <td className="px-3 py-3 text-right">{row.lowStockThreshold}</td>
                          <td className="px-3 py-3">
                            {row.supplier || '—'}
                            {row.supplierAction === 'create' && (
                              <div className="text-muted-foreground text-xs">Will create</div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="max-w-xs space-y-1 text-xs">
                              {row.messages.map((message) => (
                                <p key={message} className="text-muted-foreground">
                                  {message}
                                </p>
                              ))}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(step === 'importing' || step === 'complete') && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-emerald-500/15 text-emerald-700">
                    {importedProducts.length} imported
                  </Badge>
                  {failedCount > 0 && <Badge variant="destructive">{failedCount} failed</Badge>}
                  {step === 'importing' && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Importing…
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {progressRows.map((row) => (
                      <motion.div
                        key={row.rowIndex}
                        layout
                        initial={{ opacity: 0, x: -12, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                          row.importStatus === 'success'
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : row.importStatus === 'failed'
                              ? 'border-destructive/30 bg-destructive/5'
                              : row.importStatus === 'importing'
                                ? 'border-primary/30 bg-primary/5'
                                : 'border-border bg-card'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.productName}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {row.category}
                            {row.product?.sku ? ` · ${row.product.sku}` : ''}
                          </p>
                          {row.errorMessage && (
                            <p className="text-destructive mt-1 text-xs">{row.errorMessage}</p>
                          )}
                        </div>
                        <div className="ml-3 shrink-0">
                          {row.importStatus === 'importing' && (
                            <Loader2 className="text-primary h-4 w-4 animate-spin" />
                          )}
                          {row.importStatus === 'success' && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            >
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </motion.div>
                          )}
                          {row.importStatus === 'failed' && (
                            <AlertTriangle className="text-destructive h-5 w-5" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <div className="border-t px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-muted-foreground text-sm">
                {step === 'upload' && 'Step 1 of 3 — Upload an Excel file'}
                {step === 'review' &&
                  `${stats.total} row${stats.total === 1 ? '' : 's'} mapped for review`}
                {step === 'importing' && 'Creating products with live progress…'}
                {step === 'complete' && 'Import finished'}
              </div>
              <div className="flex items-center gap-2">
                {step === 'upload' && (
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                )}
                {step === 'review' && (
                  <>
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      Back
                    </Button>
                    <Button onClick={() => void handleConfirmImport()} disabled={!canConfirmImport}>
                      Confirm Import
                    </Button>
                  </>
                )}
                {(step === 'importing' || step === 'complete') && (
                  <Button
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    disabled={step === 'importing'}
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => {
          setDiscardOpen(false);
          setOpen(false);
          reset();
        }}
        title="Discard import?"
        description="Your uploaded file and review data will be lost."
        confirmLabel="Discard"
        variant="warning"
      />
    </>
  );
}
