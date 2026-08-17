import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { notifyStatusChangeWhatsApp } from './whatsapp-notify';

interface VehicleTaskDoc {
  orgId?: string;
  status?: string;
  customerId?: string;
  vehicleId?: string;
  dueAmount?: number;
}

export const whatsappOnStatusChange = onDocumentUpdated('vehicleTasks/{taskId}', async (event) => {
  if (!event.data) return;

  const before = event.data.before.data() as VehicleTaskDoc | undefined;
  const after = event.data.after.data() as VehicleTaskDoc | undefined;

  if (!before || !after) return;
  if (!after.orgId) return;
  if (before.status === after.status) return;

  await notifyStatusChangeWhatsApp({
    orgId: after.orgId,
    taskId: event.params.taskId,
    status: after.status ?? '',
    customerId: after.customerId,
    vehicleId: after.vehicleId,
    dueAmount: after.dueAmount,
  });
});
