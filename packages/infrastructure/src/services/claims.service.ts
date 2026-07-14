import type { ClaimsService } from '@car-spa/application';
import type { UserRole } from '@car-spa/shared';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase/client';

export class FirebaseClaimsService implements ClaimsService {
  async syncClaims(userId: string, orgId: string, role: UserRole): Promise<void> {
    const callable = httpsCallable<
      { userId: string; orgId: string; role: UserRole },
      { success: boolean }
    >(getFirebaseFunctions(), 'syncUserClaims');
    await callable({ userId, orgId, role });
  }
}
