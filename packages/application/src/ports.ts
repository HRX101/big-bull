import type { AuthSession, Membership, Organization, UserProfile } from '@car-spa/domain';
import type { UserRole } from '@car-spa/shared';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthRepository {
  signIn(credentials: AuthCredentials): Promise<AuthSession>;
  signUp(data: SignUpData): Promise<AuthSession>;
  signInWithGoogle(): Promise<AuthSession>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(data: { name: string; slug: string }): Promise<Organization>;
}

export interface MembershipRepository {
  findByUserId(userId: string): Promise<Membership | null>;
  create(data: { userId: string; orgId: string; role: UserRole }): Promise<Membership>;
}

export interface UserRepository {
  findById(id: string): Promise<UserProfile | null>;
  upsert(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<UserProfile>;
}

export interface ClaimsService {
  syncClaims(userId: string, orgId: string, role: UserRole): Promise<void>;
}

export interface AuditRepository {
  log(entry: {
    orgId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
