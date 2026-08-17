'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  customerSchema,
  vehicleSchema,
  type CustomerInput,
  type VehicleInput,
} from '@car-spa/domain';
import { PAYMENT_MODES } from '@car-spa/shared';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Car,
  Wrench,
  IndianRupee,
  CheckCircle2,
  Plus,
  Phone,
  Banknote,
  Smartphone,
  CreditCard,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useCreateVehicleTask, useServices, useVehicles } from '../api/use-vehicle-tasks';
import {
  searchCustomersUseCase,
  createCustomerUseCase,
  vehicleRepository,
  serviceRepository,
} from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import type { Customer, Vehicle, Service } from '@car-spa/domain';

interface TaskWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 'customer', label: 'Customer', icon: User, hint: 'Find or create the customer' },
  { id: 'vehicle', label: 'Vehicle', icon: Car, hint: 'Choose the vehicle being serviced' },
  { id: 'services', label: 'Services', icon: Wrench, hint: 'Select services for this job' },
  { id: 'payment', label: 'Payment', icon: IndianRupee, hint: 'Set the payment details' },
  { id: 'review', label: 'Review', icon: CheckCircle2, hint: 'Confirm and create the task' },
];

const PAYMENT_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
};

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground text-[13px] font-medium">{label}</Label>
      {children}
      {error && (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function SelectableRow({
  selected,
  onClick,
  icon,
  iconClass,
  title,
  subtitle,
  end,
}: {
  selected?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  iconClass?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150',
        selected
          ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/30'
          : 'border-border bg-card hover:border-blue-300 hover:bg-blue-50/40',
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconClass ?? 'bg-blue-500/10 text-blue-600',
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-semibold">{title}</span>
        {subtitle && (
          <span className="text-muted-foreground block truncate text-xs">{subtitle}</span>
        )}
      </span>
      {end}
      {selected && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

export function TaskWizardDialog({ open, onOpenChange, onSuccess }: TaskWizardDialogProps) {
  const session = useAuthStore((s) => s.session);
  const orgId = session?.orgId ?? '';
  const userId = session?.userId ?? '';

  const [step, setStep] = useState(0);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newVehicleMode, setNewVehicleMode] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [extraServices, setExtraServices] = useState<Service[]>([]);
  const [creatingService, setCreatingService] = useState(false);
  const [creating, setCreating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const servicesQuery = useServices(orgId);
  const vehiclesQuery = useVehicles(selectedCustomer?.id ?? null);
  const createTask = useCreateVehicleTask();
  const queryClient = useQueryClient();

  const newCustomerForm = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });
  const newVehicleForm = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { customerId: '', brand: '', model: '', vehicleNumber: '', type: 'car' },
  });

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPhoneSearch('');
      setSelectedCustomer(null);
      setSelectedVehicle(null);
      setSelectedServiceIds([]);
      setPaymentMode('CASH');
      setTotalAmount(0);
      setPaidAmount(0);
      setSearchResults([]);
      setShowNewCustomerForm(false);
      setNewVehicleMode(false);
      setShowNewService(false);
      setNewServiceName('');
      setNewServiceDescription('');
      setExtraServices([]);
    }
  }, [open]);

  useEffect(() => {
    if (selectedCustomer) {
      newVehicleForm.setValue('customerId', selectedCustomer.id);
    }
  }, [selectedCustomer, newVehicleForm]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  async function handlePhoneSearch() {
    if (!phoneSearch.trim() || !orgId) return;
    const results = await searchCustomersUseCase.execute(orgId, phoneSearch);
    setSearchResults(results);
    if (results.length === 0) {
      newCustomerForm.setValue('phone', phoneSearch.trim());
    }
    setShowNewCustomerForm(results.length === 0);
  }

  async function handleCreateNewCustomer(data: CustomerInput) {
    if (!orgId || !userId) return;
    const result = await createCustomerUseCase.execute(data, orgId, userId);
    if (result.success) {
      setSelectedCustomer(result.value);
      setShowNewCustomerForm(false);
      setStep(1);
    }
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setStep(1);
  }

  function handleSelectVehicle(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setNewVehicleMode(false);
    setStep(2);
  }

  async function handleCreateNewVehicle(data: VehicleInput) {
    if (!orgId) return;
    const vehicle = await vehicleRepository.create({ ...data, orgId });
    setSelectedVehicle(vehicle);
    setNewVehicleMode(false);
    setStep(2);
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  }

  const dueAmount = totalAmount - paidAmount;

  const allServices = Array.from(
    new Map([...extraServices, ...(servicesQuery.data ?? [])].map((s) => [s.id, s])).values(),
  );

  async function handleCreateService() {
    const name = newServiceName.trim();
    if (!name || !orgId) return;
    setCreatingService(true);
    try {
      const service = await serviceRepository.create({
        orgId,
        name,
        description: newServiceDescription.trim() || null,
        price: 0,
        active: true,
        sortOrder: allServices.length,
      });
      setExtraServices((prev) => [...prev, service]);
      setSelectedServiceIds((prev) => (prev.includes(service.id) ? prev : [...prev, service.id]));
      setShowNewService(false);
      setNewServiceName('');
      setNewServiceDescription('');
      queryClient.invalidateQueries({ queryKey: ['services', orgId] });
    } finally {
      setCreatingService(false);
    }
  }

  async function handleCreateTask() {
    if (!orgId || !userId) return;
    setCreating(true);
    const input = {
      customerId: selectedCustomer!.id,
      vehicleId: selectedVehicle!.id,
      serviceIds: selectedServiceIds,
      paymentMode,
      totalAmount,
      paidAmount,
      notes: '',
    };
    const result = await createTask.mutateAsync(input);
    setCreating(false);
    if (result.success) {
      onSuccess?.();
      onOpenChange(false);
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!selectedCustomer;
      case 1:
        return !!selectedVehicle;
      case 2:
        return selectedServiceIds.length > 0;
      case 3:
        return totalAmount > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const activeStep = STEPS[step]!;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <div className="bg-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        <div className="from-navy-light to-navy relative bg-gradient-to-br px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-sky-300 uppercase">
                Workshop
              </p>
              <h2 className="text-lg font-semibold">New Vehicle Task</h2>
              <p className="text-sm text-white/60">{activeStep.hint}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 flex max-w-full items-start justify-between overflow-x-auto px-1 pb-1">
            {STEPS.map((s, i) => (
              <Fragment key={s.id}>
                <div className="flex shrink-0 flex-col items-center gap-1.5 px-1 sm:px-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-150 sm:h-9 sm:w-9',
                      i < step
                        ? 'text-navy border-sky-400 bg-sky-400'
                        : i === step
                          ? 'border-white bg-white/10 text-white ring-4 ring-white/15'
                          : 'border-white/25 bg-white/5 text-white/50',
                    )}
                  >
                    {i < step ? (
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-medium tracking-wide sm:text-[10px]',
                      i === step ? 'font-semibold text-white' : 'text-white/50',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mt-[15px] h-0.5 min-w-2 flex-1 rounded-full transition-colors duration-300 sm:mt-[17px] sm:min-w-4',
                      i < step ? 'bg-sky-400' : 'bg-white/15',
                    )}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {step === 0 && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer by phone number"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                  />
                </div>
                <Button onClick={handlePhoneSearch}>
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Matching customers
                  </p>
                  {searchResults.map((c) => (
                    <SelectableRow
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      title={c.name}
                      subtitle={c.phone}
                      icon={<User className="h-4 w-4" />}
                      end={
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                          Select
                        </span>
                      }
                    />
                  ))}
                </div>
              )}

              {showNewCustomerForm && (
                <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    No match found — create new customer
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Full name" error={newCustomerForm.formState.errors.name?.message}>
                      <Input
                        id="newName"
                        placeholder="e.g. Rahul Sharma"
                        autoFocus
                        {...newCustomerForm.register('name')}
                      />
                    </Field>
                    <Field
                      label="Phone number"
                      error={newCustomerForm.formState.errors.phone?.message}
                    >
                      <div className="relative">
                        <Phone className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          id="newPhone"
                          placeholder="e.g. 9876543210"
                          className="pl-9"
                          {...newCustomerForm.register('phone')}
                        />
                      </div>
                    </Field>
                  </div>
                  <Button onClick={newCustomerForm.handleSubmit(handleCreateNewCustomer)}>
                    Create & Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {selectedCustomer && (
                <SelectableRow
                  selected
                  onClick={() => setStep(1)}
                  title={selectedCustomer.name}
                  subtitle={selectedCustomer.phone}
                  icon={<User className="h-4 w-4" />}
                />
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-semibold">
                    Vehicles for {selectedCustomer?.name}
                  </p>
                  <p className="text-muted-foreground text-xs">Pick the vehicle being serviced</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewVehicleMode(!newVehicleMode)}
                >
                  {newVehicleMode ? (
                    'Cancel'
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add Vehicle
                    </>
                  )}
                </Button>
              </div>

              {!newVehicleMode && (vehiclesQuery.data ?? []).length > 0 && (
                <div className="space-y-2">
                  {(vehiclesQuery.data ?? []).map((v) => (
                    <SelectableRow
                      key={v.id}
                      selected={selectedVehicle?.id === v.id}
                      onClick={() => handleSelectVehicle(v)}
                      icon={<Car className="h-4 w-4" />}
                      title={`${v.brand} ${v.model}`}
                      subtitle={`${v.vehicleNumber}  ·  ${v.type}`}
                    />
                  ))}
                </div>
              )}

              {newVehicleMode && (
                <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <p className="text-foreground text-sm font-semibold">New Vehicle</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Brand" error={newVehicleForm.formState.errors.brand?.message}>
                      <Input
                        id="brand"
                        placeholder="e.g. Maruti"
                        {...newVehicleForm.register('brand')}
                      />
                    </Field>
                    <Field label="Model" error={newVehicleForm.formState.errors.model?.message}>
                      <Input
                        id="model"
                        placeholder="e.g. Swift"
                        {...newVehicleForm.register('model')}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Vehicle number"
                    error={newVehicleForm.formState.errors.vehicleNumber?.message}
                  >
                    <Input
                      id="vehicleNumber"
                      placeholder="e.g. WB 26F 9596"
                      {...newVehicleForm.register('vehicleNumber')}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      id="type"
                      className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      {...newVehicleForm.register('type')}
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                      <option value="truck">Truck</option>
                      <option value="bus">Bus</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Button onClick={newVehicleForm.handleSubmit(handleCreateNewVehicle)}>
                    Add Vehicle
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {selectedVehicle && (
                <SelectableRow
                  selected
                  onClick={() => setStep(2)}
                  icon={<Car className="h-4 w-4" />}
                  title={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                  subtitle={`${selectedVehicle.vehicleNumber}  ·  ${selectedVehicle.type}`}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-semibold">Select services</p>
                  <p className="text-muted-foreground text-xs">
                    {selectedServiceIds.length > 0
                      ? `${selectedServiceIds.length} selected`
                      : 'Pick at least one service'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewService(!showNewService)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Service
                </Button>
              </div>

              {showNewService && (
                <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <p className="text-foreground text-sm font-semibold">New Service</p>
                  <Field label="Name">
                    <Input
                      id="newServiceName"
                      placeholder="e.g. Car Exterior Wash"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                    />
                  </Field>
                  <Button
                    size="sm"
                    onClick={handleCreateService}
                    disabled={!newServiceName.trim() || creatingService}
                  >
                    {creatingService ? 'Saving…' : 'Save Service'}
                  </Button>
                </div>
              )}

              {servicesQuery.isLoading ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Loading services...
                </p>
              ) : allServices.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <Wrench className="text-muted-foreground/60 mx-auto mb-2 h-6 w-6" />
                  <p className="text-muted-foreground text-sm">No services available.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <SelectableRow
                        key={service.id}
                        selected={isSelected}
                        onClick={() => toggleService(service.id)}
                        icon={<Wrench className={cn('h-4 w-4', isSelected && 'text-blue-600')} />}
                        iconClass={cn(
                          isSelected ? 'bg-blue-500/15' : 'bg-slate-500/10 text-slate-500',
                        )}
                        title={service.name}
                        subtitle={service.description ?? undefined}
                        end={
                          service.price > 0 ? (
                            <span className="text-foreground text-sm font-semibold">
                              ₹{service.price.toLocaleString('en-IN')}
                            </span>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Payment mode">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_MODES.map((mode) => {
                    const isSelected = paymentMode === mode;
                    const Icon = PAYMENT_ICONS[mode] ?? CreditCard;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97]',
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/25'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-blue-300',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {mode.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Total amount">
                  <div className="relative">
                    <IndianRupee className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="totalAmount"
                      type="number"
                      placeholder="0"
                      className="pl-9"
                      value={totalAmount || ''}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                    />
                  </div>
                </Field>
                <Field label="Paid amount">
                  <div className="relative">
                    <IndianRupee className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="paidAmount"
                      type="number"
                      placeholder="0"
                      className="pl-9"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                    Total
                  </p>
                  <p className="text-foreground text-base font-semibold">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                    Paid
                  </p>
                  <p className="text-base font-semibold text-emerald-600">
                    ₹{paidAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-xl border p-3',
                    dueAmount > 0 ? 'border-amber-200 bg-amber-50' : 'border-border bg-card',
                  )}
                >
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                    Due
                  </p>
                  <p
                    className={cn(
                      'text-base font-semibold',
                      dueAmount > 0 ? 'text-amber-600' : 'text-foreground',
                    )}
                  >
                    ₹{Math.max(0, dueAmount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-3">
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
                    Customer
                  </p>
                  <p className="text-foreground text-sm font-semibold">{selectedCustomer?.name}</p>
                  <p className="text-muted-foreground text-xs">{selectedCustomer?.phone}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
                    Vehicle
                  </p>
                  <p className="text-foreground text-sm font-semibold">
                    {selectedVehicle?.brand} {selectedVehicle?.model}
                  </p>
                  <p className="text-muted-foreground text-xs">{selectedVehicle?.vehicleNumber}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
                    Services ({selectedServiceIds.length})
                  </p>
                  <div className="space-y-1.5">
                    {allServices
                      .filter((s) => selectedServiceIds.includes(s.id))
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{s.name}</span>
                          {s.price > 0 && (
                            <span className="text-muted-foreground">
                              ₹{s.price.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
                    Payment
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="text-foreground font-medium">
                        {paymentMode.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-foreground font-medium">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium text-emerald-600">
                        ₹{paidAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-1.5">
                      <span className="text-foreground font-medium">Due</span>
                      <span
                        className={cn(
                          'font-semibold',
                          dueAmount > 0 ? 'text-amber-600' : 'text-emerald-600',
                        )}
                      >
                        ₹{Math.max(0, dueAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {createTask.isError && (
                <p className="text-destructive flex items-center gap-1.5 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {createTask.error.message}
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-muted/40 flex items-center justify-between gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <span className="text-muted-foreground text-xs font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreateTask} disabled={creating}>
              {creating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
