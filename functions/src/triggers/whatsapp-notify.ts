import { getFirestore } from 'firebase-admin/firestore';
import { whatsappConfig } from '../config/whatsapp.config';
import { enqueueWhatsAppJobs } from '../queues/enqueue';
import type { WhatsAppSendJob } from '../queues/whatsapp-send.task';

interface StoreSettingsDoc {
  orgId: string;
  storeName?: string;
  phone?: string | null;
  whatsappTwilioFromNumber?: string | null;
  whatsappApiKey?: string | null;
  whatsappProvider?: string | null;
}

interface CustomerDoc {
  orgId: string;
  name?: string;
  phone?: string | null;
}

interface VehicleDoc {
  orgId: string;
  vehicleNumber?: string;
}

export interface NotifyStatusChangeWhatsAppInput {
  orgId: string;
  taskId: string;
  status: string;
  customerId?: string;
  vehicleId?: string;
  dueAmount?: number;
}

export async function notifyStatusChangeWhatsApp(
  input: NotifyStatusChangeWhatsAppInput,
): Promise<void> {
  if (!input.orgId) return;

  const db = getFirestore();

  const settingsSnap = await db
    .collection('storeSettings')
    .where('orgId', '==', input.orgId)
    .limit(1)
    .get();
  const settings = settingsSnap.empty
    ? null
    : (settingsSnap.docs[0]?.data() as StoreSettingsDoc | undefined);

  const [customerSnap, vehicleSnap] = await Promise.all([
    input.customerId
      ? db.collection('customers').doc(input.customerId).get()
      : Promise.resolve(null),
    input.vehicleId ? db.collection('vehicles').doc(input.vehicleId).get() : Promise.resolve(null),
  ]);
  const customer = customerSnap?.exists ? (customerSnap.data() as CustomerDoc) : null;
  const vehicle = vehicleSnap?.exists ? (vehicleSnap.data() as VehicleDoc) : null;

  const ownerNumber = settings?.phone ? String(settings.phone) : null;
  const customerNumber = customer?.phone ? String(customer.phone) : null;
  const twilioFromNumber = settings?.whatsappTwilioFromNumber
    ? String(settings.whatsappTwilioFromNumber)
    : undefined;
  const storeProvider = settings?.whatsappProvider
    ? String(settings.whatsappProvider).toLowerCase()
    : undefined;
  const storeApiKey = settings?.whatsappApiKey ? String(settings.whatsappApiKey) : undefined;

  const jobBase: Omit<WhatsAppSendJob, 'toNumber'> = {
    storeId: input.orgId,
    taskId: input.taskId,
    status: input.status,
    customerName: customer?.name ?? 'Customer',
    vehicleNumber: vehicle?.vehicleNumber ?? 'your vehicle',
    storeName: settings?.storeName ?? 'Store',
    amountDue: typeof input.dueAmount === 'number' ? input.dueAmount : undefined,
    fromNumber: twilioFromNumber,
    storeProvider,
    storeApiKey,
  };

  const jobs: WhatsAppSendJob[] = [];
  if (ownerNumber) jobs.push({ ...jobBase, toNumber: ownerNumber });
  if (customerNumber && customerNumber !== ownerNumber) {
    jobs.push({ ...jobBase, toNumber: customerNumber });
  }

  if (jobs.length === 0) return;

  await enqueueWhatsAppJobs(jobs, whatsappConfig);
}
