import type { IWhatsAppProvider, WhatsAppMessagePayload } from '@car-spa/application';
import { err, ok, type Result } from '@car-spa/shared';

export interface MetaWhatsAppAdapterConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

export class MetaWhatsAppAdapter implements IWhatsAppProvider {
  constructor(private readonly config: MetaWhatsAppAdapterConfig) {}

  async send(payload: WhatsAppMessagePayload): Promise<Result<{ providerMessageId: string }>> {
    try {
      const url = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: payload.toNumber,
      };

      if (payload.templateName) {
        body.type = 'template';
        body.template = {
          name: payload.templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.values(payload.params).map((text) => ({ type: 'text', text })),
            },
          ],
        };
      } else {
        body.type = 'text';
        body.text = { body: payload.rawText ?? payload.params.body ?? '' };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      if (!response.ok) {
        return err(new Error(`Meta WhatsApp API error (${response.status}): ${responseText}`));
      }

      let json: { messages?: Array<{ id: string }> } = {};
      try {
        json = JSON.parse(responseText) as { messages?: Array<{ id: string }> };
      } catch {
        // Some responses carry no JSON body.
      }

      return ok({ providerMessageId: json.messages?.[0]?.id ?? 'unknown' });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Meta WhatsApp request failed'));
    }
  }
}
