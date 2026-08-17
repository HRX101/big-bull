export const NOTIFICATION_PLACEHOLDERS = [
  'customerName',
  'vehicleNumber',
  'status',
  'storeName',
  'taskId',
  'amountDue',
] as const;

export type NotificationPlaceholder = (typeof NOTIFICATION_PLACEHOLDERS)[number];

export const DEFAULT_STATUS_CHANGE_TEMPLATE =
  'Hi {{customerName}}, your vehicle {{vehicleNumber}} status is now *{{status}}* at {{storeName}}. - Team {{storeName}}';

export interface StatusChangeNotificationTemplate {
  storeId: string;
  messageTemplate: string;
  placeholders: NotificationPlaceholder[];
  updatedAt: Date;
  updatedBy: string;
}

export type NotificationTemplateValues = Record<NotificationPlaceholder, string>;

export const SAMPLE_TEMPLATE_VALUES: NotificationTemplateValues = {
  customerName: 'Rahul',
  vehicleNumber: 'KA 01 AB 1234',
  status: 'READY_FOR_PICKUP',
  storeName: 'Big Bull Car Spa',
  taskId: 'TASK-1042',
  amountDue: '₹450',
};

export function extractTemplateTokens(template: string): string[] {
  const tokens = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    tokens.add(match[1]!);
  }
  return [...tokens];
}

export function renderTemplate(template: string, values: NotificationTemplateValues): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, token: string) => {
    const value = values[token as NotificationPlaceholder];
    return value !== undefined ? value : full;
  });
}
