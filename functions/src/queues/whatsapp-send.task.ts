import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { whatsappConfig, type WhatsAppFunctionConfig } from '../config/whatsapp.config';
import { createWhatsAppService, parseStatusCode } from '../whatsapp/service';

export interface WhatsAppSendJob {
  storeId: string;
  taskId: string;
  status: string;
  toNumber: string;
  fromNumber?: string;
  customerName: string;
  vehicleNumber: string;
  storeName: string;
  amountDue?: number;
  templateName?: string;
  storeProvider?: string;
  storeApiKey?: string;
}

function resolveConfig(job: WhatsAppSendJob): WhatsAppFunctionConfig {
  if (job.storeProvider && job.storeProvider !== 'none') {
    const provider = job.storeProvider as WhatsAppFunctionConfig['provider'];
    return {
      ...whatsappConfig,
      provider,
      wasender:
        provider === 'wasender' && job.storeApiKey
          ? { apiKey: job.storeApiKey }
          : whatsappConfig.wasender,
      twilio: provider === 'twilio' && whatsappConfig.twilio ? whatsappConfig.twilio : null,
      meta: provider === 'meta' && whatsappConfig.meta ? whatsappConfig.meta : null,
    };
  }
  return whatsappConfig;
}

export async function processWhatsAppJob(job: WhatsAppSendJob): Promise<void> {
  const config = resolveConfig(job);

  if (config.provider === 'none') {
    return;
  }

  if (!job?.storeId || !job?.taskId || !job?.toNumber) {
    throw new Error('Invalid whatsappSend job payload');
  }

  const service = createWhatsAppService(config);
  const outcome = await service.sendToRecipient({
    storeId: job.storeId,
    taskId: job.taskId,
    status: job.status,
    toNumber: job.toNumber,
    fromNumber: job.fromNumber,
    templateName: job.templateName,
    values: {
      customerName: job.customerName ?? 'Customer',
      vehicleNumber: job.vehicleNumber ?? 'your vehicle',
      storeName: job.storeName ?? 'Store',
      status: job.status,
      taskId: job.taskId,
      amountDue: job.amountDue !== undefined ? `₹${job.amountDue.toLocaleString('en-IN')}` : '₹0',
    },
  });

  if (outcome.status === 'failed' && outcome.retryable) {
    const statusCode = parseStatusCode(outcome.error ?? null);
    throw new Error(
      `WhatsApp send failed for ${job.taskId} -> ${job.toNumber} (${statusCode ?? 'network error'}), scheduling retry`,
    );
  }
}

export const whatsappSend = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: whatsappConfig.maxRetries + 1,
      minBackoffSeconds: Math.max(1, Math.round(whatsappConfig.retryBackoffMs / 1000)),
    },
    rateLimits: {
      maxDispatchesPerSecond: whatsappConfig.rateLimitPerSecond,
    },
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (req) => {
    await processWhatsAppJob(req.data as WhatsAppSendJob);
  },
);
