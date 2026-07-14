import { BootstrapDefaultOrgUseCase, SignInUseCase, SignUpUseCase } from '@car-spa/application';
import { FirebaseAuthRepository } from './repositories/auth.repository';
import { FirestoreOrganizationRepository } from './repositories/organization.repository';
import { FirestoreMembershipRepository } from './repositories/membership.repository';
import { FirestoreUserRepository } from './repositories/user.repository';
import { FirestoreAuditRepository } from './repositories/audit.repository';
import { FirebaseClaimsService } from './services/claims.service';

const authRepository = new FirebaseAuthRepository();
const organizationRepository = new FirestoreOrganizationRepository();
const membershipRepository = new FirestoreMembershipRepository();
const userRepository = new FirestoreUserRepository();
const auditRepository = new FirestoreAuditRepository();
const claimsService = new FirebaseClaimsService();

export const signInUseCase = new SignInUseCase(authRepository);
export const signUpUseCase = new SignUpUseCase(authRepository);
export const bootstrapDefaultOrgUseCase = new BootstrapDefaultOrgUseCase(
  authRepository,
  organizationRepository,
  membershipRepository,
  userRepository,
  claimsService,
  auditRepository,
);

export {
  authRepository,
  organizationRepository,
  membershipRepository,
  userRepository,
  auditRepository,
  claimsService,
};

export * from './firebase/client';
export * from './firebase/config';
