'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, vehicleSchema, type CustomerInput, type VehicleInput } from '@car-spa/domain';
import { PAYMENT_MODES } from '@car-spa/shared';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, ChevronLeft, ChevronRight, User, Car, Wrench, IndianRupee, CheckCircle2, Plus } from 'lucide-react';
import {
  useCreateVehicleTask,
  useServices,
  useVehicles,
} from '../api/use-vehicle-tasks';
import { searchCustomersUseCase, createCustomerUseCase, vehicleRepository, serviceRepository } from '@car-spa/infrastructure';
import { useAuthStore } from '@/features/authentication/stores/auth-store';
import type { Customer, Vehicle, Service } from '@car-spa/domain';

interface TaskWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'payment', label: 'Payment', icon: IndianRupee },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
];

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
      case 0: return !!selectedCustomer;
      case 1: return !!selectedVehicle;
      case 2: return selectedServiceIds.length > 0;
      case 3: return totalAmount > 0;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <Card className="flex w-full max-w-2xl flex-col max-h-[90vh]">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>New Vehicle Task</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="flex border-b">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium ${
                i === step
                  ? 'border-primary text-primary border-b-2'
                  : i < step
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/40'
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Search Customer by Phone</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="Enter phone number..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                  />
                  <Button variant="outline" onClick={handlePhoneSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Matching Customers</Label>
                  {searchResults.map((c) => (
                    <div
                      key={c.id}
                      className="border-border hover:bg-muted flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-muted-foreground text-sm">{c.phone}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showNewCustomerForm && (
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-medium">Create New Customer</p>
                  <div className="space-y-2">
                    <Label htmlFor="newName">Name</Label>
                    <Input id="newName" {...newCustomerForm.register('name')} />
                    {newCustomerForm.formState.errors.name && (
                      <p className="text-destructive text-sm">{newCustomerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPhone">Phone</Label>
                    <Input id="newPhone" {...newCustomerForm.register('phone')} />
                    {newCustomerForm.formState.errors.phone && (
                      <p className="text-destructive text-sm">{newCustomerForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                  <Button onClick={newCustomerForm.handleSubmit(handleCreateNewCustomer)}>
                    Create & Continue
                  </Button>
                </div>
              )}

              {selectedCustomer && (
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm font-medium">Selected: {selectedCustomer.name}</p>
                  <p className="text-muted-foreground text-sm">{selectedCustomer.phone}</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Vehicles for {selectedCustomer?.name}</Label>
                <Button variant="outline" size="sm" onClick={() => setNewVehicleMode(!newVehicleMode)}>
                  {newVehicleMode ? 'Cancel' : 'Add New Vehicle'}
                </Button>
              </div>

              {!newVehicleMode && (vehiclesQuery.data ?? []).length > 0 && (
                <div className="space-y-2">
                  {(vehiclesQuery.data ?? []).map((v) => (
                    <div
                      key={v.id}
                      className={`border-border hover:bg-muted flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                        selectedVehicle?.id === v.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectVehicle(v)}
                    >
                      <div>
                        <p className="font-medium">{v.brand} {v.model}</p>
                        <p className="text-muted-foreground text-sm">{v.vehicleNumber}</p>
                      </div>
                      <span className="text-muted-foreground text-xs capitalize">{v.type}</span>
                    </div>
                  ))}
                </div>
              )}

              {newVehicleMode && (
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-medium">New Vehicle</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input id="brand" placeholder="e.g. Maruti" {...newVehicleForm.register('brand')} />
                      {newVehicleForm.formState.errors.brand && (
                        <p className="text-destructive text-sm">{newVehicleForm.formState.errors.brand.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" placeholder="e.g. Swift" {...newVehicleForm.register('model')} />
                      {newVehicleForm.formState.errors.model && (
                        <p className="text-destructive text-sm">{newVehicleForm.formState.errors.model.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input id="vehicleNumber" placeholder="e.g. WB 26F 9596" {...newVehicleForm.register('vehicleNumber')} />
                    {newVehicleForm.formState.errors.vehicleNumber && (
                      <p className="text-destructive text-sm">{newVehicleForm.formState.errors.vehicleNumber.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      {...newVehicleForm.register('type')}
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                      <option value="truck">Truck</option>
                      <option value="bus">Bus</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Button onClick={newVehicleForm.handleSubmit(handleCreateNewVehicle)}>
                    Add Vehicle
                  </Button>
                </div>
              )}

              {selectedVehicle && (
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm font-medium">Selected: {selectedVehicle.brand} {selectedVehicle.model}</p>
                  <p className="text-muted-foreground text-sm">{selectedVehicle.vehicleNumber}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Services (at least one)</Label>
                <Button variant="outline" size="sm" onClick={() => setShowNewService(!showNewService)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add New Service
                </Button>
              </div>

              {showNewService && (
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-medium">New Service</p>
                  <div className="space-y-2">
                    <Label htmlFor="newServiceName">Name</Label>
                    <Input
                      id="newServiceName"
                      placeholder="e.g. Car Exterior Wash"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newServiceDescription">Description (optional)</Label>
                    <Input
                      id="newServiceDescription"
                      placeholder="Short description"
                      value={newServiceDescription}
                      onChange={(e) => setNewServiceDescription(e.target.value)}
                    />
                  </div>
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
                <p className="text-muted-foreground text-sm">Loading services...</p>
              ) : allServices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No services available.{!showNewService ? ' Click "Add New Service" to create one.' : ''}
                </p>
              ) : (
                allServices.map((service) => (
                  <div
                    key={service.id}
                    className={`border-border hover:bg-muted flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                      selectedServiceIds.includes(service.id) ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          selectedServiceIds.includes(service.id)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {selectedServiceIds.includes(service.id) && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-muted-foreground text-xs">{service.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <select
                  id="paymentMode"
                  className="border-input bg-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="Enter total amount"
                  value={totalAmount || ''}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  placeholder="Enter paid amount"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>

              <div className="bg-muted rounded-md p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-medium text-amber-600">₹{Math.max(0, dueAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Review & Confirm</h3>
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Customer</p>
                  <p className="font-medium">{selectedCustomer?.name}</p>
                  <p className="text-muted-foreground">{selectedCustomer?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vehicle</p>
                  <p className="font-medium">{selectedVehicle?.brand} {selectedVehicle?.model}</p>
                  <p className="text-muted-foreground">{selectedVehicle?.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Services ({selectedServiceIds.length})</p>
                  <ul className="list-inside list-disc">
                    {allServices
                      .filter((s) => selectedServiceIds.includes(s.id))
                      .map((s) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Payment</p>
                  <p>Mode: {paymentMode.replace(/_/g, ' ')}</p>
                  <p>Total: ₹{totalAmount.toLocaleString('en-IN')}</p>
                  <p>Paid: ₹{paidAmount.toLocaleString('en-IN')}</p>
                  <p>Due: ₹{Math.max(0, dueAmount).toLocaleString('en-IN')}</p>
                </div>
              </div>
              {createTask.isError && (
                <p className="text-destructive text-sm">{createTask.error.message}</p>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-between border-t p-4">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Step {step + 1} of {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreateTask} disabled={creating}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
