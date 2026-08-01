'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CartItemData {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.itemName}</p>
        <p className="text-muted-foreground">₹{item.unitPrice.toFixed(2)} ea</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.itemId, Math.max(1, item.quantity - 1))}
          disabled={item.quantity <= 1}
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
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="w-20 text-right font-semibold">₹{(item.quantity * item.unitPrice).toFixed(2)}</p>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive h-7 w-7"
        onClick={() => onRemove(item.itemId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
