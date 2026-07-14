import { describe, expect, it } from 'vitest';
import { mapFirebaseAuthError } from '../firebase/auth-errors';

describe('mapFirebaseAuthError', () => {
  it('maps configuration-not-found to actionable message', () => {
    const error = mapFirebaseAuthError({ code: 'auth/configuration-not-found', message: 'CONFIGURATION_NOT_FOUND' });
    expect(error.message).toContain('Email/password sign-in is not enabled');
  });

  it('maps email-already-in-use', () => {
    const error = mapFirebaseAuthError({ code: 'auth/email-already-in-use', message: 'EMAIL_EXISTS' });
    expect(error.message).toContain('already exists');
  });
});
