import { describe, expect, it } from 'vitest';
import { hasPermission, assertPermission } from '../permissions';

describe('permissions', () => {
  it('grants owner full org permissions', () => {
    expect(hasPermission('owner', 'org:update')).toBe(true);
    expect(hasPermission('owner', 'membership:create')).toBe(true);
  });

  it('restricts employee from owner-only actions', () => {
    expect(hasPermission('employee', 'dashboard:read')).toBe(true);
    expect(hasPermission('employee', 'customers:create')).toBe(true);
    expect(hasPermission('employee', 'org:update')).toBe(false);
    expect(hasPermission('employee', 'customers:delete')).toBe(false);
    expect(hasPermission('employee', 'payroll:approve')).toBe(false);
  });

  it('throws when permission denied', () => {
    expect(() => assertPermission('employee', 'org:delete')).toThrow();
  });
});
