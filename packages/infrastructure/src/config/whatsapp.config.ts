import { z } from 'zod';

export const WHATSAPP_PROVIDERS = ['meta', 'twilio', 'wasender', 'none'] as const;
export type WhatsAppProviderName = (typeof WHATSAPP_PROVIDERS)[number];

const whatsappEnvSchema = z
  .object({
    WHATSAPP_PROVIDER: z.enum(['meta', 'twilio', 'wasender', 'none']).default('none'),
    WHATSAPP_META_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_META_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_META_BUSINESS_ACCOUNT_ID: z.string().optional(),
    WHATSAPP_META_API_VERSION: z.string().default('v20.0'),
    WHATSAPP_META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_TWILIO_ACCOUNT_SID: z.string().optional(),
    WHATSAPP_TWILIO_AUTH_TOKEN: z.string().optional(),
    WHATSAPP_TWILIO_FROM_NUMBER: z.string().optional(),
    WHATSAPP_TWILIO_CONTENT_SID: z.string().optional(),
    WASENDER_API_KEY: z.string().optional(),
    WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().default('91'),
    WHATSAPP_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
    WHATSAPP_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).default(2000),
    WHATSAPP_RATE_LIMIT_PER_SECOND: z.coerce.number().int().min(1).default(8),
  })
  .superRefine((data, ctx) => {
    if (data.WHATSAPP_PROVIDER === 'meta') {
      if (!data.WHATSAPP_META_PHONE_NUMBER_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WHATSAPP_META_PHONE_NUMBER_ID'],
          message: 'WHATSAPP_META_PHONE_NUMBER_ID is required when provider is "meta"',
        });
      }
      if (!data.WHATSAPP_META_ACCESS_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WHATSAPP_META_ACCESS_TOKEN'],
          message: 'WHATSAPP_META_ACCESS_TOKEN is required when provider is "meta"',
        });
      }
    }
    if (data.WHATSAPP_PROVIDER === 'twilio') {
      if (!data.WHATSAPP_TWILIO_ACCOUNT_SID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WHATSAPP_TWILIO_ACCOUNT_SID'],
          message: 'WHATSAPP_TWILIO_ACCOUNT_SID is required when provider is "twilio"',
        });
      }
      if (!data.WHATSAPP_TWILIO_AUTH_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WHATSAPP_TWILIO_AUTH_TOKEN'],
          message: 'WHATSAPP_TWILIO_AUTH_TOKEN is required when provider is "twilio"',
        });
      }
      if (!data.WHATSAPP_TWILIO_FROM_NUMBER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WHATSAPP_TWILIO_FROM_NUMBER'],
          message: 'WHATSAPP_TWILIO_FROM_NUMBER is required when provider is "twilio"',
        });
      }
    }
    if (data.WHATSAPP_PROVIDER === 'wasender') {
      if (!data.WASENDER_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WASENDER_API_KEY'],
          message: 'WASENDER_API_KEY is required when provider is "wasender"',
        });
      }
    }
  });

export interface WhatsAppConfig {
  provider: WhatsAppProviderName;
  meta: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string | null;
    apiVersion: string;
    webhookVerifyToken: string | null;
  } | null;
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    contentSid: string | null;
  } | null;
  wasender: {
    apiKey: string;
  } | null;
  defaultCountryCode: string;
  maxRetries: number;
  retryBackoffMs: number;
  rateLimitPerSecond: number;
}

export function loadWhatsAppConfig(
  env: Record<string, string | undefined> = process.env,
): WhatsAppConfig {
  const parsed = whatsappEnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid WhatsApp configuration: ${details}`);
  }

  const data = parsed.data;
  const config: WhatsAppConfig = {
    provider: data.WHATSAPP_PROVIDER,
    meta:
      data.WHATSAPP_PROVIDER === 'meta'
        ? {
            phoneNumberId: data.WHATSAPP_META_PHONE_NUMBER_ID!,
            accessToken: data.WHATSAPP_META_ACCESS_TOKEN!,
            businessAccountId: data.WHATSAPP_META_BUSINESS_ACCOUNT_ID || null,
            apiVersion: data.WHATSAPP_META_API_VERSION,
            webhookVerifyToken: data.WHATSAPP_META_WEBHOOK_VERIFY_TOKEN || null,
          }
        : null,
    twilio:
      data.WHATSAPP_PROVIDER === 'twilio'
        ? {
            accountSid: data.WHATSAPP_TWILIO_ACCOUNT_SID!,
            authToken: data.WHATSAPP_TWILIO_AUTH_TOKEN!,
            fromNumber: data.WHATSAPP_TWILIO_FROM_NUMBER!,
            contentSid: data.WHATSAPP_TWILIO_CONTENT_SID || null,
          }
        : null,
    wasender:
      data.WHATSAPP_PROVIDER === 'wasender' && data.WASENDER_API_KEY
        ? { apiKey: data.WASENDER_API_KEY }
        : null,
    defaultCountryCode: data.WHATSAPP_DEFAULT_COUNTRY_CODE,
    maxRetries: data.WHATSAPP_MAX_RETRIES,
    retryBackoffMs: data.WHATSAPP_RETRY_BACKOFF_MS,
    rateLimitPerSecond: data.WHATSAPP_RATE_LIMIT_PER_SECOND,
  };

  return Object.freeze(config);
}

export const whatsappConfig: WhatsAppConfig = loadWhatsAppConfig();
