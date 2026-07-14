import { describe, expect, it } from 'vitest';
import { parseRole } from '../firebase/mappers';

describe('mappers', () => {
  it('parses valid roles', () => {
    expect(parseRole('owner')).toBe('owner');
    expect(parseRole('employee')).toBe('employee');
  });

  it('returns null for invalid roles', () => {
    expect(parseRole('admin')).toBeNull();
    expect(parseRole(null)).toBeNull();
  });
});
