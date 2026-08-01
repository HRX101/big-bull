import type { ClaimsService } from '@car-spa/application';
import type { UserRole } from '@car-spa/shared';
import { getIdToken } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/client';

export class FirebaseClaimsService implements ClaimsService {
  async syncClaims(userId: string, orgId: string, role: UserRole): Promise<void> {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('No authenticated user');

    const idToken = await getIdToken(user, true);

    const response = await fetch('/api/sync-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ userId, orgId, role }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Failed to sync claims (status ${response.status})`);
    }
  }
}
