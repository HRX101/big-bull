import { describe, expect, it } from 'vitest';
import { signInSchema, signUpSchema, bootstrapOrgSchema, stockMovementSchema, mechanicLedgerEntrySchema } from '../validation';
import { requiresOnboarding, hasOrgContext } from '../auth';
import type { AuthSession } from '../auth';

describe('validation', () => {
  it('validates sign in', () => {
    const result = signInSchema.safeParse({
      email: 'owner@bigbull.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords on sign up', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Owner',
      email: 'owner@bigbull.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('validates bootstrap org', () => {
    const result = bootstrapOrgSchema.safeParse({ orgName: 'Big Bull Car Spa' });
    expect(result.success).toBe(true);
  });
});

describe('stockMovementSchema', () => {
  it('accepts MECHANIC_ISSUE as a valid type', () => {
    const result = stockMovementSchema.safeParse({
      productId: 'p1',
      type: 'MECHANIC_ISSUE',
      quantity: 2,
      note: 'Issued to mechanic',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid movement type', () => {
    const result = stockMovementSchema.safeParse({
      productId: 'p1',
      type: 'INVALID',
      quantity: 1,
      note: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('mechanicLedgerEntrySchema', () => {
  it('validates debit entry with items', () => {
    const result = mechanicLedgerEntrySchema.safeParse({
      mechanicId: 'm1',
      type: 'DEBIT',
      amount: 500,
      description: 'Parts issued',
      items: [{ productId: 'p1', productName: 'Oil Filter', quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it('validates credit entry without items', () => {
    const result = mechanicLedgerEntrySchema.safeParse({
      mechanicId: 'm1',
      type: 'CREDIT',
      amount: 1000,
      description: 'Sales payment',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = mechanicLedgerEntrySchema.safeParse({
      mechanicId: 'm1',
      type: 'DEBIT',
      amount: 0,
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = mechanicLedgerEntrySchema.safeParse({
      mechanicId: 'm1',
      type: 'CREDIT',
      amount: 100,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with zero quantity', () => {
    const result = mechanicLedgerEntrySchema.safeParse({
      mechanicId: 'm1',
      type: 'DEBIT',
      amount: 100,
      description: 'Parts',
      items: [{ productId: 'p1', productName: 'Filter', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('auth session', () => {
  it('detects onboarding requirement', () => {
    const session: AuthSession = {
      userId: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      emailVerified: true,
      orgId: null,
      role: null,
    };
    expect(requiresOnboarding(session)).toBe(true);
    expect(hasOrgContext(session)).toBe(false);
  });
});
