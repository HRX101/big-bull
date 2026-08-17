import * as fs from 'node:fs';
import * as path from 'node:path';

export type WhatsAppProviderName = 'meta' | 'twilio' | 'wasender' | 'none';

export interface WhatsAppFunctionConfig {
  provider: WhatsAppProviderName;
  meta: { phoneNumberId: string; accessToken: string; apiVersion: string } | null;
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    contentSid: string | null;
  } | null;
  wasender: { apiKey: string } | null;
  defaultCountryCode: string;
  maxRetries: number;
  retryBackoffMs: number;
  rateLimitPerSecond: number;
  useCloudTasks: boolean;
  queueLocation: string;
}

const VALID_PROVIDERS: readonly WhatsAppProviderName[] = ['meta', 'twilio', 'wasender', 'none'];

function loadProviderFromConfigJson():
  { provider?: WhatsAppProviderName; wasenderApiKey?: string } | undefined {
  try {
    const configPath = path.resolve(__dirname, '../../config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { provider?: string; wasenderApiKey?: string };
    if (parsed.provider && VALID_PROVIDERS.includes(parsed.provider as WhatsAppProviderName)) {
      return {
        provider: parsed.provider as WhatsAppProviderName,
        wasenderApiKey: parsed.wasenderApiKey,
      };
    }
  } catch {
    // config.json missing or invalid — fall through to env
  }
  return undefined;
}

export function loadWhatsAppFunctionConfig(
  env: Record<string, string | undefined> = process.env,
): WhatsAppFunctionConfig {
  const configJson = loadProviderFromConfigJson();
  const provider = (configJson?.provider ??
    env.WHATSAPP_PROVIDER ??
    'none') as WhatsAppProviderName;
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(
      `Invalid WHATSAPP_PROVIDER "${provider}". Expected "meta", "twilio", "wasender", or "none".`,
    );
  }

  const metaPhoneNumberId = env.WHATSAPP_META_PHONE_NUMBER_ID?.trim();
  const metaAccessToken = env.WHATSAPP_META_ACCESS_TOKEN?.trim();
  if (provider === 'meta' && (!metaPhoneNumberId || !metaAccessToken)) {
    throw new Error(
      'WHATSAPP_META_PHONE_NUMBER_ID and WHATSAPP_META_ACCESS_TOKEN are required when provider is "meta"',
    );
  }

  const twilioAccountSid = env.WHATSAPP_TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = env.WHATSAPP_TWILIO_AUTH_TOKEN?.trim();
  const twilioFromNumber = env.WHATSAPP_TWILIO_FROM_NUMBER?.trim();
  const twilioContentSid = env.WHATSAPP_TWILIO_CONTENT_SID?.trim();
  if (provider === 'twilio' && (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber)) {
    throw new Error(
      'WHATSAPP_TWILIO_ACCOUNT_SID, WHATSAPP_TWILIO_AUTH_TOKEN and WHATSAPP_TWILIO_FROM_NUMBER are required when provider is "twilio"',
    );
  }

  const wasenderApiKey = env.WASENDER_API_KEY?.trim() || configJson?.wasenderApiKey?.trim();
  if (provider === 'wasender' && !wasenderApiKey) {
    console.warn('[WhatsApp] WASENDER_API_KEY is not set. Wasender provider will be inactive.');
  }

  return Object.freeze({
    provider,
    meta:
      provider === 'meta' && metaPhoneNumberId && metaAccessToken
        ? {
            phoneNumberId: metaPhoneNumberId,
            accessToken: metaAccessToken,
            apiVersion: env.WHATSAPP_META_API_VERSION?.trim() || 'v20.0',
          }
        : null,
    twilio:
      provider === 'twilio' && twilioAccountSid && twilioAuthToken && twilioFromNumber
        ? {
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioFromNumber,
            contentSid: twilioContentSid ?? null,
          }
        : null,
    wasender: provider === 'wasender' && wasenderApiKey ? { apiKey: wasenderApiKey } : null,
    defaultCountryCode: env.WHATSAPP_DEFAULT_COUNTRY_CODE?.trim() || '91',
    maxRetries: parseInt(env.WHATSAPP_MAX_RETRIES ?? '3', 10),
    retryBackoffMs: parseInt(env.WHATSAPP_RETRY_BACKOFF_MS ?? '2000', 10),
    rateLimitPerSecond: parseInt(env.WHATSAPP_RATE_LIMIT_PER_SECOND ?? '8', 10),
    useCloudTasks: (env.WHATSAPP_USE_CLOUD_TASKS ?? 'true').toLowerCase() !== 'false',
    queueLocation: env.WHATSAPP_QUEUE_LOCATION?.trim() || 'asia-south1',
  });
}

let _cachedConfig: WhatsAppFunctionConfig | undefined;

export function getWhatsAppConfig(): WhatsAppFunctionConfig {
  if (!_cachedConfig) {
    _cachedConfig = loadWhatsAppFunctionConfig();
  }
  return _cachedConfig;
}

export function resetWhatsAppConfig(): void {
  _cachedConfig = undefined;
}

let _lazyConfig: WhatsAppFunctionConfig | undefined;
export const whatsappConfig: WhatsAppFunctionConfig = new Proxy(
  {} as unknown as WhatsAppFunctionConfig,
  {
    get(_target, prop: string) {
      if (!_lazyConfig) _lazyConfig = loadWhatsAppFunctionConfig();
      return (_lazyConfig as unknown as Record<string, unknown>)[prop];
    },
  },
);
