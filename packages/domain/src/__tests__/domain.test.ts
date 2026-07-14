import { describe, expect, it } from 'vitest';
import { signInSchema, signUpSchema, bootstrapOrgSchema } from '../validation';
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
