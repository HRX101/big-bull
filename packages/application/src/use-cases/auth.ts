import type { AuthSession } from '@car-spa/domain';
import { bootstrapOrgSchema, signInSchema, signUpSchema } from '@car-spa/domain';
import { DEFAULT_ORG_SLUG, err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  AuthRepository,
  ClaimsService,
  MembershipRepository,
  OrganizationRepository,
  UserRepository,
} from '../ports';

export class SignInUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: unknown): Promise<Result<AuthSession>> {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const session = await this.authRepo.signIn(parsed.data);
      return ok(session);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sign in failed'));
    }
  }
}

export class SignUpUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: unknown): Promise<Result<AuthSession>> {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const session = await this.authRepo.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.displayName,
      });
      await this.authRepo.sendEmailVerification();
      return ok(session);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sign up failed'));
    }
  }
}

export class BootstrapDefaultOrgUseCase {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly userRepo: UserRepository,
    private readonly claimsService: ClaimsService,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown): Promise<Result<AuthSession>> {
    const parsed = bootstrapOrgSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }

    const session = await this.authRepo.getCurrentSession();
    if (!session) {
      return err(new Error('Not authenticated'));
    }
    if (!session.emailVerified) {
      return err(new Error('Email must be verified before onboarding'));
    }
    if (session.orgId) {
      return ok(session);
    }

    const existingMembership = await this.membershipRepo.findByUserId(session.userId);
    if (existingMembership) {
      await this.claimsService.syncClaims(
        session.userId,
        existingMembership.orgId,
        existingMembership.role,
      );
      const refreshed = await this.authRepo.refreshSession();
      return ok(refreshed ?? session);
    }

    let organization = await this.orgRepo.findBySlug(DEFAULT_ORG_SLUG);
    if (!organization) {
      organization = await this.orgRepo.create({
        name: parsed.data.orgName,
        slug: DEFAULT_ORG_SLUG,
      });
    }

    const membership = await this.membershipRepo.create({
      userId: session.userId,
      orgId: organization.id,
      role: 'owner',
    });

    await this.userRepo.upsert({
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
      photoUrl: null,
      emailVerified: session.emailVerified,
      orgId: organization.id,
      role: 'owner',
    });

    await this.claimsService.syncClaims(session.userId, organization.id, membership.role);

    const refreshed = await this.authRepo.refreshSession();

    await this.auditRepo.log({
      orgId: organization.id,
      actorId: session.userId,
      action: 'org.bootstrap',
      resourceType: 'organization',
      resourceId: organization.id,
      metadata: { slug: organization.slug },
    });

    return ok(refreshed ?? session);
  }
}
