const WHATSAPP_FROM_NUMBER = '8972424853';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WHATSAPP_FROM = `whatsapp:+91${WHATSAPP_FROM_NUMBER}`;

function normalizeIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function toWhatsAppRecipient(phone: string): string {
  const normalized = normalizeIndianMobile(phone);
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    throw new Error('Invalid customer phone number for WhatsApp');
  }
  return `whatsapp:+91${normalized}`;
}

export async function deliverWhatsAppMessage(to: string, body: string) {
  const recipient = toWhatsAppRecipient(to);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.info('[whatsapp:dev]', { from: WHATSAPP_FROM, to: recipient, body });
    return { sid: 'dev-logged', status: 'logged' };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: WHATSAPP_FROM,
        To: recipient,
        Body: body,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp delivery failed: ${errorBody}`);
  }

  return response.json();
}
