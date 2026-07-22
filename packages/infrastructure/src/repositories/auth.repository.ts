import type {
  AuthCredentials,
  AuthRepository,
  MembershipRepository,
  SignUpData,
  UserRepository,
} from '@car-spa/application';
import type { AuthSession } from '@car-spa/domain';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import type { ActionCodeSettings } from 'firebase/auth';
import { AUTH_ROUTES } from '@car-spa/shared';
import { getAppOrigin } from '../firebase/app-url';
import { getFirebaseAuth, googleProvider } from '../firebase/client';
import { mapFirebaseAuthError } from '../firebase/auth-errors';
import { mapFirebaseUserToSession } from '../firebase/mappers';

function getActionCodeSettings(): ActionCodeSettings {
  return {
    url: `${getAppOrigin()}${AUTH_ROUTES.authAction}`,
    handleCodeInApp: true,
  };
}

export class FirebaseAuthRepository implements AuthRepository {
  constructor(
    private readonly membershipRepo?: MembershipRepository,
    private readonly userRepo?: UserRepository,
  ) {}

  private async syncUserOrgContext(session: AuthSession): Promise<void> {
    if (!this.userRepo || !session.orgId || !session.role) return;

    await this.userRepo.upsert({
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
      photoUrl: null,
      emailVerified: session.emailVerified,
      orgId: session.orgId,
      role: session.role,
    });
  }

  private async enrichSession(session: AuthSession): Promise<AuthSession> {
    let enriched = session;

    if (this.membershipRepo) {
      const membership = await this.membershipRepo.findByUserId(session.userId);
      if (membership) {
        enriched = {
          ...session,
          orgId: membership.orgId,
          role: membership.role,
        };
      }
    }

    await this.syncUserOrgContext(enriched);

    return enriched;
  }

  async signIn(credentials: AuthCredentials) {
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );
      await result.user.getIdToken(true);
      return this.enrichSession(await mapFirebaseUserToSession(result.user));
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async signUp(data: SignUpData) {
    try {
      const auth = getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(result.user, { displayName: data.displayName });
      return this.enrichSession(await mapFirebaseUserToSession(result.user));
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async signInWithGoogle() {
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, googleProvider);
      await result.user.getIdToken(true);
      return this.enrichSession(await mapFirebaseUserToSession(result.user));
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async signOut() {
    await signOut(getFirebaseAuth());
  }

  async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email, getActionCodeSettings());
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async sendEmailVerification() {
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No authenticated user');
      await sendEmailVerification(user, getActionCodeSettings());
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async applyEmailVerification(actionCode: string) {
    try {
      await applyActionCode(getFirebaseAuth(), actionCode);
      const user = getFirebaseAuth().currentUser;
      if (user) await user.reload();
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async inspectActionCode(actionCode: string) {
    try {
      const info = await checkActionCode(getFirebaseAuth(), actionCode);
      return info.operation;
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async verifyPasswordResetCode(actionCode: string) {
    try {
      return await verifyPasswordResetCode(getFirebaseAuth(), actionCode);
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async confirmPasswordReset(actionCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(getFirebaseAuth(), actionCode, newPassword);
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async getCurrentSession() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return this.enrichSession(await mapFirebaseUserToSession(user));
  }

  async refreshSession() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    await user.getIdToken(true);
    return this.enrichSession(await mapFirebaseUserToSession(user));
  }

  subscribe(callback: (session: AuthSession | null) => void): () => void {
    return onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      callback(await this.enrichSession(await mapFirebaseUserToSession(user)));
    });
  }
}
