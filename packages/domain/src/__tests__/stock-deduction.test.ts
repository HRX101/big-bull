import { describe, expect, it } from 'vitest';

function updateStock(current: number, delta: number): number {
  const newCount = current + delta;
  return Math.max(0, newCount);
}

function isLowStock(stockCount: number, threshold: number): boolean {
  return stockCount <= threshold;
}

describe('Stock Deduction Logic', () => {
  describe('updateStock', () => {
    it('deducts stock correctly', () => {
      expect(updateStock(100, -5)).toBe(95);
    });

    it('adds stock correctly', () => {
      expect(updateStock(50, 10)).toBe(60);
    });

    it('never goes below zero', () => {
      expect(updateStock(3, -10)).toBe(0);
    });

    it('handles zero stock deduction', () => {
      expect(updateStock(0, -1)).toBe(0);
    });
  });

  describe('isLowStock', () => {
    it('flags stock at threshold as low', () => {
      expect(isLowStock(5, 5)).toBe(true);
    });

    it('flags stock below threshold as low', () => {
      expect(isLowStock(3, 5)).toBe(true);
    });

    it('does not flag stock above threshold', () => {
      expect(isLowStock(10, 5)).toBe(false);
    });

    it('flags zero stock as low', () => {
      expect(isLowStock(0, 1)).toBe(true);
    });
  });
});
