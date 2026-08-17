import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { notifyStatusChangeWhatsApp } from './whatsapp-notify';

interface VehicleTaskDoc {
  orgId?: string;
  status?: string;
  customerId?: string;
  vehicleId?: string;
  dueAmount?: number;
}

export const whatsappOnTaskCreated = onDocumentCreated('vehicleTasks/{taskId}', async (event) => {
  if (!event.data) return;

  const task = event.data.data() as VehicleTaskDoc | undefined;
  if (!task?.orgId) return;

  await notifyStatusChangeWhatsApp({
    orgId: task.orgId,
    taskId: event.params.taskId,
    status: task.status ?? 'RECEIVED',
    customerId: task.customerId,
    vehicleId: task.vehicleId,
    dueAmount: task.dueAmount,
  });
});
