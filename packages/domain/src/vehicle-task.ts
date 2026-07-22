export const VEHICLE_TASK_STATUSES = ['todo', 'in_progress', 'ready_for_pickup'] as const;

export type VehicleTaskStatus = (typeof VEHICLE_TASK_STATUSES)[number];

const LEGACY_VEHICLE_TASK_STATUS_MAP: Record<string, VehicleTaskStatus> = {
  received: 'todo',
  inspection: 'todo',
  in_progress: 'in_progress',
  quality_check: 'in_progress',
  ready: 'ready_for_pickup',
  completed: 'ready_for_pickup',
};

export function normalizeVehicleTaskStatus(status: unknown): VehicleTaskStatus {
  const value = String(status);
  if (VEHICLE_TASK_STATUSES.includes(value as VehicleTaskStatus)) {
    return value as VehicleTaskStatus;
  }
  return LEGACY_VEHICLE_TASK_STATUS_MAP[value] ?? 'todo';
}

export const VEHICLE_TASK_TRANSITIONS: Record<VehicleTaskStatus, readonly VehicleTaskStatus[]> = {
  todo: ['in_progress'],
  in_progress: ['todo', 'ready_for_pickup'],
  ready_for_pickup: ['in_progress'],
} as const;

export function canTransitionVehicleTask(from: VehicleTaskStatus, to: VehicleTaskStatus): boolean {
  return VEHICLE_TASK_TRANSITIONS[from].includes(to);
}

export function getNextVehicleTaskStatuses(status: VehicleTaskStatus): VehicleTaskStatus[] {
  return [...VEHICLE_TASK_TRANSITIONS[status]];
}

export const VEHICLE_TASK_STATUS_LABELS: Record<VehicleTaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  ready_for_pickup: 'Ready to pickup',
};

export function generateVehicleTaskCode(existingCodes: string[], date = new Date()): string {
  const year = date.getFullYear();
  const prefix = `VT-${year}-`;
  const sequences = existingCodes
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number.parseInt(code.slice(prefix.length), 10))
    .filter((value) => !Number.isNaN(value));
  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export function formatVehicleTaskVehicle(task: {
  vehicleBrand: string;
  vehicleModel: string;
  vehicleNumber: string;
}): string {
  const brandModel = [task.vehicleBrand, task.vehicleModel].filter(Boolean).join(' ');
  if (task.vehicleNumber) {
    return brandModel ? `${brandModel} (${task.vehicleNumber})` : task.vehicleNumber;
  }
  return brandModel;
}

export const WORKSHOP_SERVICES = [
  'car_exterior_wash',
  'interior_wash',
  'bike_wash',
  'polish',
  'tyre_change',
] as const;

export type WorkshopService = (typeof WORKSHOP_SERVICES)[number];

export const WORKSHOP_SERVICE_LABELS: Record<WorkshopService, string> = {
  car_exterior_wash: 'Car exterior wash',
  interior_wash: 'Interior wash',
  bike_wash: 'Bike wash',
  polish: 'Polish',
  tyre_change: 'Tyre change',
};

export function formatVehicleTaskServices(task: {
  services: WorkshopService[];
  problemStatement?: string | null;
}): string {
  if (task.services.length > 0) {
    return task.services.map((service) => WORKSHOP_SERVICE_LABELS[service]).join(', ');
  }
  return task.problemStatement ?? '—';
}

export function buildVehicleTaskStatusWhatsAppMessage(input: {
  customerName: string;
  taskCode: string;
  vehicleLabel: string;
  status: VehicleTaskStatus;
}): string {
  const intro = `Hi ${input.customerName},`;
  const statusMessages: Record<VehicleTaskStatus, string> = {
    todo: `${intro} your vehicle task ${input.taskCode} (${input.vehicleLabel}) has been registered and is in our queue.`,
    in_progress: `${intro} work is now in progress on your vehicle ${input.vehicleLabel} (${input.taskCode}).`,
    ready_for_pickup: `${intro} your vehicle ${input.vehicleLabel} (${input.taskCode}) is ready for pickup!`,
  };
  return `${statusMessages[input.status]} - Big Bull Car Spa`;
}

export type VehicleTaskPaymentStatus = 'unpaid' | 'partial' | 'paid';

export function getVehicleTaskPaymentDue(task: {
  amount: number | null;
  advancePayment: number | null;
}): number {
  const total = task.amount ?? 0;
  const advance = task.advancePayment ?? 0;
  return Math.max(0, total - advance);
}

export function getVehicleTaskPaymentStatus(task: {
  amount: number | null;
  advancePayment: number | null;
}): VehicleTaskPaymentStatus {
  const total = task.amount ?? 0;
  const advance = task.advancePayment ?? 0;
  if (total <= 0) return 'unpaid';
  if (advance >= total) return 'paid';
  if (advance > 0) return 'partial';
  return 'unpaid';
}

export const VEHICLE_TASK_PAYMENT_STATUS_LABELS: Record<VehicleTaskPaymentStatus, string> = {
  unpaid: 'Payment due',
  partial: 'Partially paid',
  paid: 'Paid in full',
};
