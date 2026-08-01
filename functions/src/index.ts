import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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

interface TaskStatusEvent {
  orgId: string;
  taskId: string;
  toStatus: string;
  note: string;
  whatsappStatus: string;
}

export const onTaskStatusChange = onDocumentCreated(
  'taskStatusEvents/{eventId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data() as TaskStatusEvent;
    if (!data.orgId) return;

    const db = getFirestore();

    const settingsSnap = await db
      .collection('storeSettings')
      .where('orgId', '==', data.orgId)
      .limit(1)
      .get();

    if (settingsSnap.empty) return;
    const settings = settingsSnap.docs[0]!.data();
    if (settings.whatsappProvider === 'NONE') return;

    const taskSnap = await db.collection('vehicleTasks').doc(data.taskId).get();
    if (!taskSnap.exists) return;
    const task = taskSnap.data()!;

    const customerSnap = await db.collection('customers').doc(task.customerId).get();
    if (!customerSnap.exists) return;
    const customer = customerSnap.data()!;

    const message = `Big Bull Car Spa: Your vehicle task (#${data.taskId.slice(-6)}) is now ${data.toStatus}. ${data.note}`;

    const recipients = new Set<string>();
    const ownerPhone = settings.phone ? String(settings.phone) : '';
    const customerPhone = customer.phone ? String(customer.phone) : '';
    if (ownerPhone) recipients.add(ownerPhone);
    if (customerPhone) recipients.add(customerPhone);

    if (recipients.size === 0 || !settings.whatsappApiKey) return;

    const send = async (phone: string) => {
      let phoneNumber = phone.replace(/[^0-9]/g, '');
      if (phoneNumber.length === 10) phoneNumber = `91${phoneNumber}`;
      if (!phoneNumber) return;
      try {
        if (settings.whatsappProvider === 'META') {
          const url = `https://graph.facebook.com/v21.0/${settings.whatsappPhoneNumberId || ''}/messages`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settings.whatsappApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phoneNumber,
              type: 'template',
              template: {
                name: settings.whatsappTemplateId || 'vehicle_task_update',
                language: { code: 'en' },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: customer.name || 'Customer' },
                      { type: 'text', text: data.toStatus },
                      { type: 'text', text: data.note },
                    ],
                  },
                ],
              },
            }),
          });

          const responseText = await response.text();
          await db.collection('notificationLogs').add({
            orgId: data.orgId,
            type: 'WHATSAPP',
            recipient: phoneNumber,
            templateId: settings.whatsappTemplateId,
            message,
            status: response.ok ? 'SENT' : 'FAILED',
            error: response.ok ? null : responseText,
            referenceType: 'taskStatusEvent',
            referenceId: event.params.eventId,
            retryCount: 0,
            createdAt: new Date(),
          });

          return response.ok;
        }

        await db.collection('notificationLogs').add({
          orgId: data.orgId,
          type: 'WHATSAPP',
          recipient: phoneNumber,
          templateId: settings.whatsappTemplateId,
          message,
          status: 'FAILED',
          error: `WhatsApp provider "${settings.whatsappProvider}" is not supported by the sender yet`,
          referenceType: 'taskStatusEvent',
          referenceId: event.params.eventId,
          retryCount: 0,
          createdAt: new Date(),
        });
        return false;
      } catch (error) {
        await db.collection('notificationLogs').add({
          orgId: data.orgId,
          type: 'WHATSAPP',
          recipient: phone,
          templateId: settings.whatsappTemplateId,
          message,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          referenceType: 'taskStatusEvent',
          referenceId: event.params.eventId,
          retryCount: 0,
          createdAt: new Date(),
        });
        return false;
      }
    };

    const results = await Promise.all([...recipients].map(send));

    if (results.some((ok) => ok)) {
      await db.collection('taskStatusEvents').doc(event.params.eventId).update({
        whatsappStatus: 'SENT',
      });
    }
  },
);
