'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Customer, PaymentMethod, VehicleTask, WorkshopService } from '@car-spa/domain';
import {
  PAYMENT_METHOD_LABELS,
  WORKSHOP_SERVICES,
  WORKSHOP_SERVICE_LABELS,
  formatIndianMobileE164,
  formatVehicleTaskVehicle,
  getVehicleTaskPaymentDue,
  normalizeIndianMobile,
  vehicleTaskCreateFormSchema,
} from '@car-spa/domain';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IndiaPhoneInput } from '@/components/shared/india-phone-input';
import { PageHeader } from '@/components/shared/page-header';
import { TaskStatusBoard } from '@/features/vehicles/ui/task-status-board';
import { cn } from '@/lib/utils';
import {
  useCreateCustomer,
  useCreateVehicleTask,
  useCustomers,
  useDeleteVehicleTask,
  useTransitionVehicleTask,
  useUpdateCustomer,
  useUpdateVehicleTask,
  useVehicleTasks,
} from '@/hooks/use-operations';

function findCustomerByPhone(customers: Customer[], phone: string) {
  const normalized = normalizeIndianMobile(phone);
  if (normalized.length !== 10) return undefined;
  return customers.find((customer) => normalizeIndianMobile(customer.phone) === normalized);
}

function taskMatchesCustomerSearch(
  task: VehicleTask,
  customer: Customer | undefined,
  query: string,
) {
  const trimmed = query.trim();
  if (!trimmed) return true;
  if (!customer) return false;

  const nameMatch = customer.name.toLowerCase().includes(trimmed.toLowerCase());
  const queryDigits = normalizeIndianMobile(trimmed);
  const phoneDigits = normalizeIndianMobile(customer.phone);
  const phoneMatch = queryDigits.length > 0 && phoneDigits.includes(queryDigits);

  return nameMatch || phoneMatch;
}

const TASK_FORM_STEPS = [
  {
    title: 'Customer details',
    fields: ['customerPhone', 'customerName'] as const,
  },
  {
    title: 'Vehicle details',
    fields: ['vehicleBrand', 'vehicleModel', 'vehicleNumber'] as const,
  },
  {
    title: 'Select services',
    fields: ['services'] as const,
  },
  {
    title: 'Payment',
    fields: ['paymentMethod', 'amount', 'advancePayment'] as const,
  },
  {
    title: 'Review',
    fields: [] as const,
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

type TaskFormValues = {
  customerPhone: string;
  customerName: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleNumber: string;
  services: WorkshopService[];
  paymentMethod?: PaymentMethod;
  amount?: number;
  advancePayment: number;
};

const EMPTY_TASK_FORM: TaskFormValues = {
  customerPhone: '',
  customerName: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleNumber: '',
  services: [],
  advancePayment: 0,
};

function closeTaskForm(
  resetForm: () => void,
  setMatchedCustomer: (customer: Customer | null) => void,
  setStep: (step: number) => void,
  setSubmitError: (error: string | null) => void,
  setEditingTaskId: (taskId: string | null) => void,
) {
  resetForm();
  setMatchedCustomer(null);
  setStep(1);
  setSubmitError(null);
  setEditingTaskId(null);
}

export function TasksPage() {
  const { data: tasks = [], isLoading, error: tasksError } = useVehicleTasks();
  const { data: customers = [] } = useCustomers();
  const createTask = useCreateVehicleTask();
  const updateTask = useUpdateVehicleTask();
  const deleteTask = useDeleteVehicleTask();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const transition = useTransitionVehicleTask();
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentTaskId, setPaymentTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(vehicleTaskCreateFormSchema),
    defaultValues: EMPTY_TASK_FORM,
  });

  const isEditing = editingTaskId != null;

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        taskMatchesCustomerSearch(task, customerById.get(task.customerId), searchQuery),
      ),
    [tasks, customerById, searchQuery],
  );

  const customerPhone = watch('customerPhone');
  const formValues = watch();

  useEffect(() => {
    if (!customerPhone || normalizeIndianMobile(customerPhone).length < 10) {
      setMatchedCustomer(null);
      return;
    }

    const match = findCustomerByPhone(customers, customerPhone);
    setMatchedCustomer(match ?? null);
    if (match) {
      setValue('customerName', match.name, { shouldValidate: true });
    }
  }, [customerPhone, customers, setValue]);

  const goToNextStep = async () => {
    const currentStep = TASK_FORM_STEPS[step - 1];
    if (!currentStep) return;
    const fields = [...currentStep.fields];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((current) => Math.min(current + 1, TASK_FORM_STEPS.length));
  };

  const goToPreviousStep = () => {
    setSubmitError(null);
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleCloseForm = () => {
    closeTaskForm(reset, setMatchedCustomer, setStep, setSubmitError, setEditingTaskId);
    setPaymentTaskId(null);
    setShowForm(false);
  };

  const startCreateTask = () => {
    closeTaskForm(reset, setMatchedCustomer, setStep, setSubmitError, setEditingTaskId);
    setShowForm(true);
  };

  const startEditTask = (task: VehicleTask) => {
    const customer = customers.find((entry) => entry.id === task.customerId);
    reset({
      customerPhone: customer?.phone ?? '',
      customerName: customer?.name ?? '',
      vehicleBrand: task.vehicleBrand,
      vehicleModel: task.vehicleModel,
      vehicleNumber: task.vehicleNumber,
      services: task.services,
      paymentMethod: task.paymentMethod ?? undefined,
      amount: task.amount ?? undefined,
      advancePayment: task.advancePayment ?? 0,
    });
    setMatchedCustomer(customer ?? null);
    setEditingTaskId(task.id);
    setStep(1);
    setSubmitError(null);
    setShowForm(true);
  };

  const handleDeleteTask = async (task: VehicleTask) => {
    if (!window.confirm(`Delete task ${task.taskCode}? This cannot be undone.`)) return;
    const result = await deleteTask.mutateAsync(task.id);
    if (!result.success) {
      window.alert(result.error?.message ?? 'Failed to delete task.');
      return;
    }
    if (editingTaskId === task.id) handleCloseForm();
  };

  const submitTask = handleSubmit(async (data) => {
    setSubmitError(null);
    const formattedPhone = formatIndianMobileE164(data.customerPhone);
    if (!formattedPhone) {
      setSubmitError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    const existingCustomer = findCustomerByPhone(customers, formattedPhone);
    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      const nameChanged = existingCustomer.name !== data.customerName;
      const phoneChanged =
        normalizeIndianMobile(existingCustomer.phone) !== normalizeIndianMobile(formattedPhone);
      if (nameChanged || phoneChanged) {
        const updateResult = await updateCustomer.mutateAsync({
          id: existingCustomer.id,
          input: {
            name: data.customerName,
            phone: formattedPhone,
            email: existingCustomer.email ?? '',
            notes: existingCustomer.notes ?? '',
          },
        });
        if (!updateResult.success) {
          setSubmitError(updateResult.error?.message ?? 'Failed to update customer.');
          return;
        }
      }
    } else {
      const createResult = await createCustomer.mutateAsync({
        name: data.customerName,
        phone: formattedPhone,
      });
      if (!createResult.success) {
        setSubmitError(createResult.error.message ?? 'Failed to create customer.');
        return;
      }
      customerId = createResult.value.id;
    }

    const taskInput = {
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleNumber: data.vehicleNumber,
      customerId,
      services: data.services,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      advancePayment: data.advancePayment,
    };

    const result = editingTaskId
      ? await updateTask.mutateAsync({ id: editingTaskId, input: taskInput })
      : await createTask.mutateAsync(taskInput);
    if (!result.success) {
      setSubmitError(
        result.error?.message ?? `Failed to ${editingTaskId ? 'update' : 'create'} task.`,
      );
      return;
    }

    handleCloseForm();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Tasks"
        description="Track vehicles through the workshop state machine."
        action={
          <Button
            onClick={() => {
              if (showForm) handleCloseForm();
              else startCreateTask();
            }}
          >
            {showForm ? 'Cancel' : 'New task'}
          </Button>
        }
      />
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {isEditing ? 'Edit task' : 'Create task'}
            </h3>
            <ol className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              {TASK_FORM_STEPS.map((formStep, index) => {
                const stepNumber = index + 1;
                const isActive = step === stepNumber;
                const isComplete = step > stepNumber;

                return (
                  <li key={formStep.title} className="flex items-center gap-3">
                    {index > 0 && <span className="text-muted-foreground hidden sm:inline">—</span>}
                    <span
                      className={cn(
                        'flex items-center gap-1.5',
                        isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                          isActive && 'bg-primary text-primary-foreground',
                          isComplete && 'bg-muted text-foreground',
                          !isActive && !isComplete && 'border-muted-foreground/40 border',
                        )}
                      >
                        {stepNumber}
                      </span>
                      <span className="hidden sm:inline">{formStep.title}</span>
                      <span className="sm:hidden">{stepNumber === step ? formStep.title : ''}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <form
              onSubmit={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
              className="space-y-4"
            >
              {step === 1 && (
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="customerPhone">Contact number</Label>
                    <Controller
                      name="customerPhone"
                      control={control}
                      render={({ field }) => (
                        <IndiaPhoneInput
                          id="customerPhone"
                          size="sm"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    {errors.customerPhone && (
                      <p className="text-destructive text-xs">{errors.customerPhone.message}</p>
                    )}
                    {matchedCustomer && (
                      <p className="text-muted-foreground text-xs">
                        Existing customer found — details auto-filled.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="customerName">Name</Label>
                    <Input
                      id="customerName"
                      className="h-9"
                      placeholder="Customer name"
                      {...register('customerName')}
                    />
                    {errors.customerName && (
                      <p className="text-destructive text-xs">{errors.customerName.message}</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="vehicleBrand">Vehicle Brand</Label>
                    <Input
                      id="vehicleBrand"
                      className="h-9"
                      placeholder="e.g. Honda"
                      {...register('vehicleBrand')}
                    />
                    {errors.vehicleBrand && (
                      <p className="text-destructive text-xs">{errors.vehicleBrand.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                      id="vehicleModel"
                      className="h-9"
                      placeholder="e.g. City"
                      {...register('vehicleModel')}
                    />
                    {errors.vehicleModel && (
                      <p className="text-destructive text-xs">{errors.vehicleModel.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      className="h-9"
                      placeholder="Enter vehicle number"
                      {...register('vehicleNumber')}
                    />
                    {errors.vehicleNumber && (
                      <p className="text-destructive text-xs">{errors.vehicleNumber.message}</p>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <Label>Select Services</Label>
                  <Controller
                    name="services"
                    control={control}
                    render={({ field }) => (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {WORKSHOP_SERVICES.map((service) => {
                          const selected = field.value?.includes(service);
                          return (
                            <label
                              key={service}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                                selected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:bg-muted/50',
                              )}
                            >
                              <input
                                type="checkbox"
                                className="accent-primary"
                                checked={selected}
                                onChange={(event) => {
                                  const current = field.value ?? [];
                                  const next = event.target.checked
                                    ? [...current, service]
                                    : current.filter((value: WorkshopService) => value !== service);
                                  field.onChange(next);
                                }}
                              />
                              {WORKSHOP_SERVICE_LABELS[service]}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.services && (
                    <p className="text-destructive text-xs">{errors.services.message}</p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="paymentMethod">Payment mode</Label>
                    <select
                      id="paymentMethod"
                      className="border-input bg-input h-9 w-full rounded-md border px-3 text-sm"
                      {...register('paymentMethod')}
                    >
                      <option value="">Select payment mode</option>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errors.paymentMethod && (
                      <p className="text-destructive text-xs">{errors.paymentMethod.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="amount">Total amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9"
                      placeholder="0.00"
                      {...register('amount', { valueAsNumber: true })}
                    />
                    {errors.amount && (
                      <p className="text-destructive text-xs">{errors.amount.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="advancePayment">Advance payment</Label>
                    <Input
                      id="advancePayment"
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-9"
                      placeholder="0.00"
                      {...register('advancePayment', { valueAsNumber: true })}
                    />
                    {errors.advancePayment && (
                      <p className="text-destructive text-xs">{errors.advancePayment.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Payment due</Label>
                    <Input
                      readOnly
                      className="bg-muted h-9"
                      value={formatCurrency(
                        getVehicleTaskPaymentDue({
                          amount: Number(formValues.amount) || 0,
                          advancePayment: Number(formValues.advancePayment) || 0,
                        }),
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Customer</dt>
                    <dd className="font-medium">{formValues.customerName || '—'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Contact</dt>
                    <dd className="font-medium">
                      {formatIndianMobileE164(formValues.customerPhone) ?? formValues.customerPhone}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Vehicle</dt>
                    <dd className="font-medium">
                      {formatVehicleTaskVehicle({
                        vehicleBrand: formValues.vehicleBrand,
                        vehicleModel: formValues.vehicleModel,
                        vehicleNumber: formValues.vehicleNumber,
                      }) || '—'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Payment</dt>
                    <dd className="font-medium">
                      {formValues.paymentMethod
                        ? PAYMENT_METHOD_LABELS[formValues.paymentMethod]
                        : '—'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Total amount</dt>
                    <dd className="font-medium">
                      {formValues.amount != null && !Number.isNaN(formValues.amount)
                        ? formatCurrency(formValues.amount)
                        : '—'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Advance payment</dt>
                    <dd className="font-medium">
                      {formValues.advancePayment != null && !Number.isNaN(formValues.advancePayment)
                        ? formatCurrency(formValues.advancePayment)
                        : '—'}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground text-xs">Payment due</dt>
                    <dd className="font-medium text-amber-700">
                      {formatCurrency(
                        getVehicleTaskPaymentDue({
                          amount: Number(formValues.amount) || 0,
                          advancePayment: Number(formValues.advancePayment) || 0,
                        }),
                      )}
                    </dd>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <dt className="text-muted-foreground text-xs">Services</dt>
                    <dd className="font-medium">
                      {formValues.services?.length
                        ? formValues.services
                            .map((service: WorkshopService) => WORKSHOP_SERVICE_LABELS[service])
                            .join(', ')
                        : '—'}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {step > 1 && (
                    <Button type="button" size="sm" variant="outline" onClick={goToPreviousStep}>
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {submitError && <p className="text-destructive text-xs">{submitError}</p>}
                  {step < TASK_FORM_STEPS.length ? (
                    <Button type="button" size="sm" onClick={goToNextStep}>
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        createTask.isPending ||
                        updateTask.isPending ||
                        createCustomer.isPending ||
                        updateCustomer.isPending
                      }
                      onClick={() => void submitTask()}
                    >
                      {isEditing ? 'Save changes' : 'Create new task'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {tasksError && (
        <p className="text-destructive text-sm">Failed to load tasks: {tasksError.message}</p>
      )}
      {!showForm && (
        <div className="max-w-md">
          <Label htmlFor="task-search" className="sr-only">
            Search tasks
          </Label>
          <Input
            id="task-search"
            className="h-9"
            placeholder="Search by customer name or contact number"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      )}
      <TaskStatusBoard
        tasks={filteredTasks}
        emptyMessage={
          searchQuery.trim()
            ? 'No tasks match this customer name or contact number.'
            : 'No tasks yet.'
        }
        paymentTaskId={paymentTaskId}
        onOpenPayment={setPaymentTaskId}
        onClosePayment={() => setPaymentTaskId(null)}
        onEdit={startEditTask}
        onDelete={handleDeleteTask}
        onTransition={(taskId, toStatus) => transition.mutate({ taskId, toStatus })}
        isDeleting={deleteTask.isPending}
      />
    </div>
  );
}
