import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { deliverWhatsAppMessage } from './whatsapp';

initializeApp();
setGlobalOptions({ region: 'asia-south1' });

type UserRole = 'owner' | 'employee';

interface SyncClaimsRequest {
  userId: string;
  orgId: string;
  role: UserRole;
}

interface GenerateReceiptRequest {
  orderId: string;
  orgId: string;
}

interface SendWhatsAppMessageRequest {
  to: string;
  body: string;
}

export const sendWhatsAppMessage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const data = request.data as SendWhatsAppMessageRequest;
  if (!data?.to || !data?.body?.trim()) {
    throw new HttpsError('invalid-argument', 'to and body are required');
  }

  try {
    const result = await deliverWhatsAppMessage(data.to, data.body.trim());
    return {
      success: true,
      from: '8972424853',
      to: data.to,
      providerMessageId: (result as { sid?: string }).sid ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send WhatsApp message';
    throw new HttpsError('internal', message);
  }
});

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

export const generateReceipt = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const data = request.data as GenerateReceiptRequest;
  if (!data?.orderId || !data?.orgId) {
    throw new HttpsError('invalid-argument', 'orderId and orgId are required');
  }

  const tokenOrgId = request.auth.token.orgId as string | undefined;
  if (tokenOrgId && tokenOrgId !== data.orgId) {
    throw new HttpsError('permission-denied', 'Organization mismatch');
  }

  const db = getFirestore();
  const orderSnap = await db.collection('posOrders').doc(data.orderId).get();
  if (!orderSnap.exists || orderSnap.data()?.orgId !== data.orgId) {
    throw new HttpsError('not-found', 'Order not found');
  }

  const order = orderSnap.data()!;
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items
    .map(
      (item: { description: string; quantity: number; unitPrice: number; lineTotal: number }) =>
        `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${item.unitPrice}</td><td>${item.lineTotal}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><body><h1>Big Bull Car Spa</h1>
    <p>Order: ${data.orderId}</p>
    <table border="1"><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>${lines}</table>
    <p>Total: ${order.total}</p></body></html>`;

  return { receiptId: `receipt-${data.orderId}`, html };
});
