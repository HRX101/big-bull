import { describe, expect, it } from 'vitest';
import {
  VEHICLE_TASK_TRANSITIONS,
  buildVehicleTaskStatusWhatsAppMessage,
  canTransitionVehicleTask,
  generateVehicleTaskCode,
  getNextVehicleTaskStatuses,
  getVehicleTaskPaymentDue,
  getVehicleTaskPaymentStatus,
  normalizeVehicleTaskStatus,
} from '../vehicle-task';

describe('vehicle task state machine', () => {
  it('allows valid transitions from todo', () => {
    expect(canTransitionVehicleTask('todo', 'in_progress')).toBe(true);
    expect(canTransitionVehicleTask('todo', 'ready_for_pickup')).toBe(false);
  });

  it('returns next statuses', () => {
    expect(getNextVehicleTaskStatuses('in_progress')).toEqual(['todo', 'ready_for_pickup']);
  });

  it('ready_for_pickup can move back to in progress', () => {
    expect(VEHICLE_TASK_TRANSITIONS.ready_for_pickup).toEqual(['in_progress']);
  });

  it('maps legacy statuses to the simplified workflow', () => {
    expect(normalizeVehicleTaskStatus('received')).toBe('todo');
    expect(normalizeVehicleTaskStatus('ready')).toBe('ready_for_pickup');
    expect(normalizeVehicleTaskStatus('completed')).toBe('ready_for_pickup');
  });
});

describe('vehicle task WhatsApp messages', () => {
  it('builds a status-specific customer message', () => {
    expect(
      buildVehicleTaskStatusWhatsAppMessage({
        customerName: 'Rahul',
        taskCode: 'VT-2025-0001',
        vehicleLabel: 'Honda City (MH 12 AB 1234)',
        status: 'ready_for_pickup',
      }),
    ).toContain('ready for pickup');
  });
});

describe('vehicle task payment helpers', () => {
  it('calculates payment due', () => {
    expect(getVehicleTaskPaymentDue({ amount: 1000, advancePayment: 300 })).toBe(700);
  });

  it('returns payment status', () => {
    expect(getVehicleTaskPaymentStatus({ amount: 1000, advancePayment: 0 })).toBe('unpaid');
    expect(getVehicleTaskPaymentStatus({ amount: 1000, advancePayment: 250 })).toBe('partial');
    expect(getVehicleTaskPaymentStatus({ amount: 1000, advancePayment: 1000 })).toBe('paid');
  });
});

describe('generateVehicleTaskCode', () => {
  it('starts the yearly sequence at 0001', () => {
    expect(generateVehicleTaskCode([], new Date('2025-07-22'))).toBe('VT-2025-0001');
  });

  it('increments within the same year', () => {
    expect(generateVehicleTaskCode(['VT-2025-0001', 'VT-2025-0002'], new Date('2025-07-22'))).toBe(
      'VT-2025-0003',
    );
  });

  it('resets the sequence for a new year', () => {
    expect(generateVehicleTaskCode(['VT-2024-0012'], new Date('2025-01-01'))).toBe('VT-2025-0001');
  });
});
