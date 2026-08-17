'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  itemCount,
  itemLabel,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemCount?: number;
  itemLabel?: string;
}) {
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {itemCount !== undefined ? (
        <p className="text-muted-foreground text-xs">
          Page {safePage + 1} of {totalPages}
          {itemLabel ? ` · ${itemCount} ${itemLabel}` : ''}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Page {safePage + 1} of {totalPages}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage === 0}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
