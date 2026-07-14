'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  VEHICLE_TASK_STATUS_LABELS,
  getNextVehicleTaskStatuses,
  vehicleTaskSchema,
} from '@car-spa/domain';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/shared/badge';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import {
  useCreateVehicleTask,
  useCustomers,
  useTransitionVehicleTask,
  useVehicleTasks,
  useVehicles,
} from '@/hooks/use-operations';

export function TasksPage() {
  const { data: tasks = [], isLoading } = useVehicleTasks();
  const { data: vehicles = [] } = useVehicles();
  const { data: customers = [] } = useCustomers();
  const createTask = useCreateVehicleTask();
  const transition = useTransitionVehicleTask();
  const [showForm, setShowForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleTaskSchema),
  });

  const vehicleLabel = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.make} ${v.model} (${v.plateNumber})` : id;
  };

  const onSubmit = handleSubmit(async (data) => {
    const result = await createTask.mutateAsync(data);
    if (result.success) {
      reset();
      setShowForm(false);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Tasks"
        description="Track vehicles through the workshop state machine."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New task'}</Button>
        }
      />
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <select
                  className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                  {...register('vehicleId')}
                  onChange={(e) => {
                    const vehicle = vehicles.find((v) => v.id === e.target.value);
                    if (vehicle) {
                      const customerField = document.getElementById(
                        'customerId',
                      ) as HTMLSelectElement;
                      if (customerField) customerField.value = vehicle.customerId;
                    }
                    register('vehicleId').onChange(e);
                  }}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {vehicleLabel(v.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <select
                  id="customerId"
                  className="border-input bg-input h-10 w-full rounded-md border px-3 text-sm"
                  {...register('customerId')}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input {...register('title')} />
                {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input {...register('description')} />
              </div>
              <Button type="submit" disabled={createTask.isPending}>
                Create task
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <DataTable
        headers={['Title', 'Vehicle', 'Status', 'Transitions']}
        rows={tasks.map((t) => [
          t.title,
          vehicleLabel(t.vehicleId),
          <Badge key={`${t.id}-status`}>{VEHICLE_TASK_STATUS_LABELS[t.status]}</Badge>,
          <div key={`${t.id}-actions`} className="flex flex-wrap gap-2">
            {getNextVehicleTaskStatuses(t.status).map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() => transition.mutate({ taskId: t.id, toStatus: status })}
              >
                → {VEHICLE_TASK_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>,
        ])}
      />
    </div>
  );
}
