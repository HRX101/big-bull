import type { IWhatsAppProvider, WhatsAppMessagePayload } from '@car-spa/application';
import { err, ok, type Result } from '@car-spa/shared';

export interface TwilioWhatsAppAdapterConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class TwilioWhatsAppAdapter implements IWhatsAppProvider {
  constructor(private readonly config: TwilioWhatsAppAdapterConfig) {}

  async send(payload: WhatsAppMessagePayload): Promise<Result<{ providerMessageId: string }>> {
    try {
      const to = `whatsapp:${payload.toNumber}`;
      const from = `whatsapp:${this.config.fromNumber}`;
      const body = payload.rawText ?? payload.params.body ?? '';

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: to, Body: body }),
        },
      );

      const responseText = await response.text();
      if (!response.ok) {
        return err(new Error(`Twilio WhatsApp API error (${response.status}): ${responseText}`));
      }

      let json: { sid?: string } = {};
      try {
        json = JSON.parse(responseText) as { sid?: string };
      } catch {
        // Some responses carry no JSON body.
      }

      return ok({ providerMessageId: json.sid ?? 'unknown' });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Twilio WhatsApp request failed'));
    }
  }
}
