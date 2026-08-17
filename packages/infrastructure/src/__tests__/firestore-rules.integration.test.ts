import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('firestore rules tenancy', () => {
  it('denies unauthenticated access by default', () => {
    const rules = readFileSync(resolve(__dirname, '../../../../firebase/firestore.rules'), 'utf8');
    expect(rules).toContain('allow read, write: if false');
    expect(rules).toContain('docBelongsToOrg');
    expect(rules).toContain('isOwner()');
  });

  it('makes audit logs immutable', () => {
    const rules = readFileSync(resolve(__dirname, '../../../../firebase/firestore.rules'), 'utf8');
    expect(rules).toContain('allow update, delete: if false');
  });
});
