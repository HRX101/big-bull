const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export function normalizeIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function formatIndianMobileE164(phone: string): string | null {
  const normalized = normalizeIndianMobile(phone);
  if (!INDIAN_MOBILE_REGEX.test(normalized)) return null;
  return `+91${normalized}`;
}

export function isValidIndianMobile(phone: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(phone));
}
