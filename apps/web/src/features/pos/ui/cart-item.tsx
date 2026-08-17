'use client';

import { Hash, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CartItemData {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  serialNumbers?: string[];
}

interface CartItemProps {
  item: CartItemData;
  isSerialized: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onAddSerials: (item: CartItemData) => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({
  item,
  isSerialized,
  onUpdateQuantity,
  onAddSerials,
  onRemove,
}: CartItemProps) {
  const serials = item.serialNumbers ?? [];
  const shownSerials = serials.slice(0, 3);
  const hiddenCount = Math.max(0, serials.length - shownSerials.length);

  return (
    <div className="border-border group bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-sm shadow-black/5 transition-all hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.itemName}</p>
          {isSerialized && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              <Hash className="h-3 w-3" />
              Serialized
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          ₹
          {item.unitPrice.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          ea
        </p>
        {isSerialized && serials.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {shownSerials.map((sn) => (
              <span
                key={sn}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
              >
                {sn}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                +{hiddenCount} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isSerialized ? (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.itemId, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              aria-label="Remove one serial"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-muted-foreground grid w-8 place-items-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddSerials(item)}
              aria-label="Add serials"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.itemId, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-muted-foreground grid w-8 place-items-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.itemId, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      <p className="w-20 text-right text-sm font-bold">
        ₹
        {(item.quantity * item.unitPrice).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>

      <div className="flex items-center gap-1">
        {isSerialized && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddSerials(item)}
            aria-label="Edit serials"
            title="Edit serial numbers"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-7 w-7"
          onClick={() => onRemove(item.itemId)}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
