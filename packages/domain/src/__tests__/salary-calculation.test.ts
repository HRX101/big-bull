import { describe, expect, it } from 'vitest';

function calculateSalary(
  fullSalary: number,
  workingDays: number,
  leaveDays: number,
): { perDayRate: number; deduction: number; payableAmount: number } {
  const perDayRate = fullSalary / workingDays;
  const deduction = leaveDays * perDayRate;
  const payableAmount = fullSalary - deduction;
  return {
    perDayRate: Math.round(perDayRate * 100) / 100,
    deduction: Math.round(deduction * 100) / 100,
    payableAmount: Math.round(payableAmount * 100) / 100,
  };
}

describe('calculateSalary', () => {
  it('calculates correctly with no leave', () => {
    const result = calculateSalary(30000, 26, 0);
    expect(result.perDayRate).toBeCloseTo(1153.85, 1);
    expect(result.deduction).toBe(0);
    expect(result.payableAmount).toBe(30000);
  });

  it('deducts correctly for 2 leave days', () => {
    const result = calculateSalary(30000, 26, 2);
    expect(result.perDayRate).toBeCloseTo(1153.85, 1);
    expect(result.deduction).toBeCloseTo(2307.7, 1);
    expect(result.payableAmount).toBeCloseTo(27692.3, 1);
  });

  it('returns zero payable when full month leave', () => {
    const result = calculateSalary(30000, 26, 26);
    expect(result.payableAmount).toBe(0);
  });

  it('handles different salary amounts correctly', () => {
    const result = calculateSalary(50000, 25, 3);
    expect(result.perDayRate).toBe(2000);
    expect(result.deduction).toBe(6000);
    expect(result.payableAmount).toBe(44000);
  });

  it('handles fractional per-day rates', () => {
    const result = calculateSalary(35000, 26, 1);
    expect(result.perDayRate).toBeCloseTo(1346.15, 1);
    expect(result.deduction).toBeCloseTo(1346.15, 1);
    expect(result.payableAmount).toBeCloseTo(33653.85, 1);
  });
});
