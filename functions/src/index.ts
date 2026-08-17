import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'asia-south1' });

type UserRole = 'owner' | 'employee';

interface SyncClaimsRequest {
  userId: string;
  orgId: string;
  role: UserRole;
}

export const syncUserClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const data = request.data as SyncClaimsRequest;
  if (!data?.userId || !data?.orgId || !data?.role) {
    throw new HttpsError('invalid-argument', 'userId, orgId, and role are required');
  }

  if (request.auth.uid !== data.userId && request.auth.token.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Cannot sync claims for another user');
  }

  await getAuth().setCustomUserClaims(data.userId, {
    orgId: data.orgId,
    role: data.role,
  });

  return { success: true };
});

export { whatsappOnStatusChange } from './triggers/whatsapp-on-status-change';
export { whatsappOnTaskCreated } from './triggers/whatsapp-on-task-created';
export { whatsappSend } from './queues/whatsapp-send.task';
