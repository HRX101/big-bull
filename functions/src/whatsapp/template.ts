export const NOTIFICATION_PLACEHOLDERS = [
  'customerName',
  'vehicleNumber',
  'status',
  'storeName',
  'taskId',
  'amountDue',
] as const;

export const DEFAULT_STATUS_CHANGE_TEMPLATE =
  'Hi {{customerName}}, your vehicle {{vehicleNumber}} status is now *{{status}}* at {{storeName}}. - Team {{storeName}}';

export type TemplateValues = Record<string, string>;

export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, token: string) => {
    const value = values[token];
    return value !== undefined ? value : full;
  });
}
