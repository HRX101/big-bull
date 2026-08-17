import { describe, expect, it, vi } from 'vitest';
import { BootstrapDefaultOrgUseCase } from '../use-cases/auth';
import type {
  AuditRepository,
  AuthRepository,
  ClaimsService,
  MembershipRepository,
  OrganizationRepository,
  UserRepository,
} from '../ports';

describe('BootstrapDefaultOrgUseCase', () => {
  const session = {
    userId: 'user-1',
    email: 'owner@test.com',
    displayName: 'Owner',
    emailVerified: true,
    orgId: null,
    role: null,
  };

  it('creates default org and membership for first owner', async () => {
    const authRepo: AuthRepository = {
      getCurrentSession: vi.fn().mockResolvedValue(session),
      refreshSession: vi
        .fn()
        .mockResolvedValue({ ...session, orgId: 'org-1', role: 'owner' as const }),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      getRedirectResult: vi.fn().mockResolvedValue(null),
      signOut: vi.fn(),
      sendPasswordReset: vi.fn(),
      sendEmailVerification: vi.fn(),
    };

    const orgRepo: OrganizationRepository = {
      findById: vi.fn(),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Big Bull Car Spa',
        slug: 'big-bull-car-spa',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const membershipRepo: MembershipRepository = {
      findByUserId: vi.fn().mockResolvedValue(null),
      findByOrgId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        orgId: 'org-1',
        role: 'owner' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn(),
    };

    const userRepo: UserRepository = {
      findById: vi.fn(),
      findByOrgId: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn(),
    };

    const claimsService: ClaimsService = {
      syncClaims: vi.fn().mockResolvedValue(undefined),
    };

    const auditRepo: AuditRepository = {
      log: vi.fn().mockResolvedValue(undefined),
      findByOrgId: vi.fn().mockResolvedValue([]),
    };

    const useCase = new BootstrapDefaultOrgUseCase(
      authRepo,
      orgRepo,
      membershipRepo,
      userRepo,
      claimsService,
      auditRepo,
    );

    const result = await useCase.execute({ orgName: 'Big Bull Car Spa' });
    expect(result.success).toBe(true);
    expect(claimsService.syncClaims).toHaveBeenCalledWith('user-1', 'org-1', 'owner');
    expect(auditRepo.log).toHaveBeenCalled();
  });
});
