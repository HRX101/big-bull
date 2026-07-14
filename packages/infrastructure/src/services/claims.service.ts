import type { ClaimsService } from '@car-spa/application';
import type { UserRole } from '@car-spa/shared';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase/client';
import { mapFirebaseAuthError } from '../firebase/auth-errors';

function isClaimsSyncEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CLAIMS_SYNC === 'true';
}

export class FirebaseClaimsService implements ClaimsService {
  async syncClaims(userId: string, orgId: string, role: UserRole): Promise<void> {
    // Off by default on Spark/free tier — membership documents supply org context client-side.
    if (!isClaimsSyncEnabled()) return;

    try {
      const callable = httpsCallable<
        { userId: string; orgId: string; role: UserRole },
        { success: boolean }
      >(getFirebaseFunctions(), 'syncUserClaims');
      await callable({ userId, orgId, role });
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }
}
