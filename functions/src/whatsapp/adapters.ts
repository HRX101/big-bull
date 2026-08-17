export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SendPayload {
  toNumber: string;
  fromNumber?: string;
  rawText: string;
  templateName?: string;
  params: Record<string, string>;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export class MetaWhatsAppAdapter {
  constructor(
    private readonly config: { phoneNumberId: string; accessToken: string; apiVersion: string },
  ) {}

  async send(payload: SendPayload): Promise<SendResult> {
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
      body.text = { body: payload.rawText };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false,
        error: `Meta WhatsApp API error (${response.status}): ${errorBody}`,
      };
    }

    const json = await readJson(response);
    const messages = json.messages as Array<{ id: string }> | undefined;
    return { ok: true, providerMessageId: messages?.[0]?.id ?? 'unknown' };
  }
}

export class TwilioWhatsAppAdapter {
  constructor(
    private readonly config: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
      contentSid?: string | null;
    },
  ) {}

  async send(payload: SendPayload): Promise<SendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    const fromNumber = payload.fromNumber || this.config.fromNumber;
    const form = new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${payload.toNumber}`,
    });

    const values = Object.values(payload.params).filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    console.log(
      `[Twilio] contentSid=${this.config.contentSid ?? 'null'} valuesCount=${values.length}`,
    );
    if (this.config.contentSid && values.length > 0) {
      console.log(`[Twilio] Using ContentSid mode: ${this.config.contentSid}`);
      form.set('ContentSid', this.config.contentSid);
      form.set(
        'ContentVariables',
        JSON.stringify(
          Object.fromEntries(values.map((value, index) => [String(index + 1), value])),
        ),
      );
    } else {
      console.log('[Twilio] Using free-form Body mode');
      form.set('Body', payload.rawText);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.config.accountSid}:${this.config.authToken}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { ok: false, error: `Twilio WhatsApp API error (${response.status}): ${errorBody}` };
    }

    const json = await readJson(response);
    return { ok: true, providerMessageId: (json.sid as string) ?? 'unknown' };
  }
}

export class WasenderWhatsAppAdapter {
  constructor(private readonly config: { apiKey: string; baseUrl?: string }) {}

  async send(payload: SendPayload): Promise<SendResult> {
    const baseUrl = this.config.baseUrl || 'https://www.wasenderapi.com';
    const url = `${baseUrl}/api/send-message`;

    const e164 = payload.toNumber.startsWith('+') ? payload.toNumber : `+${payload.toNumber}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: e164,
        text: payload.rawText,
      }),
    });

    const json = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        error: `WasenderAPI error (${response.status}): ${JSON.stringify(json)}`,
      };
    }

    const success = json.success === true || json.success === 'true';
    if (!success) {
      return {
        ok: false,
        error: `WasenderAPI rejected message: ${JSON.stringify(json)}`,
      };
    }

    const data = (json.data ?? {}) as Record<string, unknown>;
    return { ok: true, providerMessageId: String(data.msgId ?? 'unknown') };
  }
}
