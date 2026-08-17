import { getFunctions } from 'firebase-admin/functions';
import type { WhatsAppFunctionConfig } from '../config/whatsapp.config';
import { processWhatsAppJob, type WhatsAppSendJob } from './whatsapp-send.task';

export async function enqueueWhatsAppJobs(
  jobs: WhatsAppSendJob[],
  config: WhatsAppFunctionConfig,
): Promise<void> {
  if (jobs.length === 0) return;

  if (!config.useCloudTasks) {
    // Inline path for local dev / emulator where Cloud Tasks is not available.
    // Still protected by the Firestore dedupe transaction inside the service.
    await Promise.all(jobs.map((job) => processWhatsAppJob(job).catch(() => undefined)));
    return;
  }

  const queue = getFunctions().taskQueue(
    `locations/${config.queueLocation}/functions/whatsappSend`,
  );
  // One isolated job per recipient so a slow/failing send never blocks others.
  await Promise.all(jobs.map((job) => queue.enqueue(job)));
}
