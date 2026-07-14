import { describe, expect, it } from 'vitest';
import {
  VEHICLE_TASK_TRANSITIONS,
  canTransitionVehicleTask,
  getNextVehicleTaskStatuses,
} from '../vehicle-task';

describe('vehicle task state machine', () => {
  it('allows valid transitions from received', () => {
    expect(canTransitionVehicleTask('received', 'inspection')).toBe(true);
    expect(canTransitionVehicleTask('received', 'completed')).toBe(false);
  });

  it('returns next statuses', () => {
    expect(getNextVehicleTaskStatuses('in_progress')).toEqual(['quality_check', 'inspection']);
  });

  it('completed state has no outgoing transitions', () => {
    expect(VEHICLE_TASK_TRANSITIONS.completed).toEqual([]);
  });
});
