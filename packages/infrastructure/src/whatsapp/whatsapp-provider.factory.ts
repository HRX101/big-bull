import type { IWhatsAppProvider, WhatsAppMessagePayload } from '@car-spa/application';
import { err, type Result } from '@car-spa/shared';
import type { WhatsAppConfig } from '../config/whatsapp.config';
import { MetaWhatsAppAdapter } from './meta-whatsapp.adapter';
import { TwilioWhatsAppAdapter } from './twilio-whatsapp.adapter';

export class NoopWhatsAppAdapter implements IWhatsAppProvider {
  async send(_payload: WhatsAppMessagePayload): Promise<Result<{ providerMessageId: string }>> {
    return err(new Error('WhatsApp provider is not configured (WHATSAPP_PROVIDER=none)'));
  }
}

export function createWhatsAppProvider(config: WhatsAppConfig): IWhatsAppProvider {
  switch (config.provider) {
    case 'meta': {
      const meta = config.meta;
      if (!meta) {
        throw new Error('WHATSAPP_PROVIDER=meta but Meta credentials are missing');
      }
      return new MetaWhatsAppAdapter({
        phoneNumberId: meta.phoneNumberId,
        accessToken: meta.accessToken,
        apiVersion: meta.apiVersion,
      });
    }
    case 'twilio': {
      const twilio = config.twilio;
      if (!twilio) {
        throw new Error('WHATSAPP_PROVIDER=twilio but Twilio credentials are missing');
      }
      return new TwilioWhatsAppAdapter({
        accountSid: twilio.accountSid,
        authToken: twilio.authToken,
        fromNumber: twilio.fromNumber,
      });
    }
    default:
      return new NoopWhatsAppAdapter();
  }
}
