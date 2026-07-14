export const VEHICLE_TASK_STATUSES = [
  'received',
  'inspection',
  'in_progress',
  'quality_check',
  'ready',
  'completed',
] as const;

export type VehicleTaskStatus = (typeof VEHICLE_TASK_STATUSES)[number];

export const VEHICLE_TASK_TRANSITIONS: Record<VehicleTaskStatus, readonly VehicleTaskStatus[]> = {
  received: ['inspection'],
  inspection: ['in_progress', 'received'],
  in_progress: ['quality_check', 'inspection'],
  quality_check: ['ready', 'in_progress'],
  ready: ['completed', 'quality_check'],
  completed: [],
} as const;

export function canTransitionVehicleTask(
  from: VehicleTaskStatus,
  to: VehicleTaskStatus,
): boolean {
  return VEHICLE_TASK_TRANSITIONS[from].includes(to);
}

export function getNextVehicleTaskStatuses(status: VehicleTaskStatus): VehicleTaskStatus[] {
  return [...VEHICLE_TASK_TRANSITIONS[status]];
}

export const VEHICLE_TASK_STATUS_LABELS: Record<VehicleTaskStatus, string> = {
  received: 'Received',
  inspection: 'Inspection',
  in_progress: 'In Progress',
  quality_check: 'Quality Check',
  ready: 'Ready',
  completed: 'Completed',
};
