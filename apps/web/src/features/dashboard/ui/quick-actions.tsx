'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Car,
  ShoppingCart,
  Wind,
  Search,
  X,
  CreditCard,
} from 'lucide-react';
import { PROTECTED_ROUTES, PAYMENT_MODES } from '@car-spa/shared';
import type { PaymentMode } from '@car-spa/shared';
import type { Customer, POSSale } from '@car-spa/domain';
import { customerRepository } from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSale } from '@/features/pos/api/use-pos';
import { ReceiptModal } from '@/features/pos/ui/receipt-modal';

export function QuickActions() {
  const router = useRouter();
  const [airOpen, setAirOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(PROTECTED_ROUTES.vehicleTasks)}
        >
          <Car className="mr-1.5 h-3.5 w-3.5" />
          Vehicle Task
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push(PROTECTED_ROUTES.pos)}>
          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
          Sales
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAirOpen(true)}>
          <Wind className="mr-1.5 h-3.5 w-3.5" />
          Air
        </Button>
      </div>
      {airOpen && <AirSaleDialog onClose={() => setAirOpen(false)} />}
    </>
  );
}

function AirSaleDialog({ onClose }: { onClose: () => void }) {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';
  const queryClient = useQueryClient();
  const createSale = useCreateSale();

  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [completedSale, setCompletedSale] = useState<POSSale | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  const isNewCustomer = lookedUp && !customer && phone.trim().length >= 10;
  const amt = Number(amount);

  const handleLookup = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    setPhone(digits);
    const found = await customerRepository.findByPhone(orgId, digits);
    setCustomer(found);
    setLookedUp(true);
    if (found) setName(found.name);
    else setName('');
  };

  const handleSell = async () => {
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (phone.replace(/\D/g, '').length >= 10 && !customer && !name.trim()) {
      toast.error('Enter the customer name');
      return;
    }

    let customerId: string | null = null;
    const trimmedPhone = phone.replace(/\D/g, '');
    if (trimmedPhone) {
      if (customer) {
        customerId = customer.id;
      } else if (name.trim()) {
        const created = await customerRepository.create({
          orgId,
          name: name.trim(),
          phone: trimmedPhone,
          email: null,
          address: null,
          totalSpend: 0,
          visitCount: 0,
        });
        customerId = created.id;
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
    }

    const result = await createSale.mutateAsync({
      customerId: customerId ?? '',
      items: [{ itemId: '', itemName: 'Air in Tyre', quantity: 1, unitPrice: amt }],
      paymentMode,
    });

    if (result.success) {
      setReceiptName(customer ? customer.name : name.trim() || null);
      setCompletedSale(result.value);
      queryClient.invalidateQueries({ queryKey: ['revenue-today'] });
      setPhone('');
      setCustomer(null);
      setLookedUp(false);
      setName('');
      setAmount('');
      setPaymentMode('CASH');
    }
  };

  const close = () => {
    if (completedSale) {
      setCompletedSale(null);
      setReceiptName(null);
      return;
    }
    if (phone || name || amount) {
      if (!confirm('Discard this sale?')) return;
    }
    onClose();
  };

  return (
    <>
      <div
        className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={close}
        role="dialog"
        aria-modal="true"
        aria-labelledby="air-sale-title"
      >
        <div
          className="bg-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-border sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
            <div className="flex items-center gap-2">
              <Wind className="text-primary h-5 w-5" />
              <h2 id="air-sale-title" className="text-lg font-semibold">Air in Tyre</h2>
            </div>
            <button onClick={close} className="hover:bg-muted rounded p-1" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="air-phone">Customer phone</Label>
              <div className="flex gap-2">
                <Input
                  id="air-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setLookedUp(false);
                    setCustomer(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleLookup();
                    }
                  }}
                  placeholder="10-digit mobile number"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleLookup}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {customer && (
              <div className="border-border flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="text-muted-foreground text-xs">{customer.phone}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomer(null);
                    setLookedUp(false);
                    setName('');
                  }}
                >
                  Change
                </Button>
              </div>
            )}

            {isNewCustomer && !customer && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  No customer found with this number. Enter the name to create one.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="air-name">Customer name</Label>
                  <Input
                    id="air-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="air-amount">Amount</Label>
              <Input
                id="air-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="air-payment">Payment Mode</Label>
              <select
                id="air-payment"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="border-input bg-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === 'CASH'
                      ? 'Cash'
                      : mode === 'UPI'
                        ? 'UPI'
                        : mode === 'CARD'
                          ? 'Card'
                          : mode === 'NET_BANKING'
                            ? 'Net Banking'
                            : 'Other'}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSell}
              disabled={createSale.isPending || !amt || amt <= 0}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {createSale.isPending ? 'Processing…' : `Sell — ₹${amt ? amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`}
            </Button>
          </div>
        </div>
      </div>
      <ReceiptModal
        sale={completedSale}
        customerName={receiptName}
        onClose={() => {
          setCompletedSale(null);
          setReceiptName(null);
        }}
      />
    </>
  );
}
