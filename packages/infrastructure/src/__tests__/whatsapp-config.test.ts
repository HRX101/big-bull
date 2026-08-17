import { describe, expect, it } from 'vitest';
import { loadWhatsAppConfig } from '../config/whatsapp.config';

describe('loadWhatsAppConfig', () => {
  it('defaults to provider "none" when not configured', () => {
    const config = loadWhatsAppConfig({});
    expect(config.provider).toBe('none');
    expect(config.meta).toBeNull();
    expect(config.twilio).toBeNull();
    expect(config.defaultCountryCode).toBe('91');
    expect(config.maxRetries).toBe(3);
    expect(config.rateLimitPerSecond).toBe(8);
  });

  it('parses meta credentials', () => {
    const config = loadWhatsAppConfig({
      WHATSAPP_PROVIDER: 'meta',
      WHATSAPP_META_PHONE_NUMBER_ID: '123456789',
      WHATSAPP_META_ACCESS_TOKEN: 'token-abc',
      WHATSAPP_META_API_VERSION: 'v20.0',
    });
    expect(config.provider).toBe('meta');
    expect(config.meta).toEqual({
      phoneNumberId: '123456789',
      accessToken: 'token-abc',
      businessAccountId: null,
      apiVersion: 'v20.0',
      webhookVerifyToken: null,
    });
  });

  it('parses twilio credentials', () => {
    const config = loadWhatsAppConfig({
      WHATSAPP_PROVIDER: 'twilio',
      WHATSAPP_TWILIO_ACCOUNT_SID: 'sid-1',
      WHATSAPP_TWILIO_AUTH_TOKEN: 'auth-1',
      WHATSAPP_TWILIO_FROM_NUMBER: '+15551234567',
    });
    expect(config.provider).toBe('twilio');
    expect(config.twilio).toEqual({
      accountSid: 'sid-1',
      authToken: 'auth-1',
      fromNumber: '+15551234567',
      contentSid: null,
    });
  });

  it('throws when meta is selected without credentials', () => {
    expect(() => loadWhatsAppConfig({ WHATSAPP_PROVIDER: 'meta' })).toThrow(
      /WHATSAPP_META_PHONE_NUMBER_ID/,
    );
  });

  it('throws when twilio is selected without credentials', () => {
    expect(() =>
      loadWhatsAppConfig({
        WHATSAPP_PROVIDER: 'twilio',
        WHATSAPP_TWILIO_ACCOUNT_SID: 'sid-1',
      }),
    ).toThrow(/WHATSAPP_TWILIO_AUTH_TOKEN/);
  });

  it('coerces numeric env values', () => {
    const config = loadWhatsAppConfig({
      WHATSAPP_MAX_RETRIES: '5',
      WHATSAPP_RETRY_BACKOFF_MS: '4000',
      WHATSAPP_RATE_LIMIT_PER_SECOND: '20',
    });
    expect(config.maxRetries).toBe(5);
    expect(config.retryBackoffMs).toBe(4000);
    expect(config.rateLimitPerSecond).toBe(20);
  });
});
