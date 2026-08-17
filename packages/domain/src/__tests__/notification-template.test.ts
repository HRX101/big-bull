import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATUS_CHANGE_TEMPLATE,
  extractTemplateTokens,
  renderTemplate,
  SAMPLE_TEMPLATE_VALUES,
} from '../entities/notification-template.entity';
import {
  statusChangeTemplateSchema,
  updateStatusChangeTemplateSchema,
  validateTemplateTokens,
} from '../schemas/notification-template.schema';

describe('notification template', () => {
  it('renders placeholders from sample values', () => {
    const rendered = renderTemplate(DEFAULT_STATUS_CHANGE_TEMPLATE, SAMPLE_TEMPLATE_VALUES);
    expect(rendered).toContain('Rahul');
    expect(rendered).toContain('KA 01 AB 1234');
    expect(rendered).toContain('READY_FOR_PICKUP');
    expect(rendered).toContain('Big Bull Car Spa');
  });

  it('leaves unknown tokens untouched', () => {
    const rendered = renderTemplate('Hi {{unknownToken}}', SAMPLE_TEMPLATE_VALUES);
    expect(rendered).toBe('Hi {{unknownToken}}');
  });

  it('extracts tokens', () => {
    expect(extractTemplateTokens('{{a}} and {{ b }} and {{a}}')).toEqual(['a', 'b']);
  });

  it('accepts a template using only supported placeholders', () => {
    const result = statusChangeTemplateSchema.safeParse({
      storeId: 'org-1',
      messageTemplate: 'Hello {{customerName}} at {{storeName}}',
      placeholders: ['customerName', 'storeName'],
      updatedAt: new Date(),
      updatedBy: 'user-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a template with unknown placeholders', () => {
    const result = statusChangeTemplateSchema.safeParse({
      storeId: 'org-1',
      messageTemplate: 'Hello {{customerName}} {{bogus}}',
      updatedAt: new Date(),
      updatedBy: 'user-1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('bogus');
    }
  });

  it('rejects a template with no placeholders', () => {
    const result = updateStatusChangeTemplateSchema.safeParse({
      storeId: 'org-1',
      messageTemplate: 'Static message',
      updatedBy: 'user-1',
    });
    expect(result.success).toBe(false);
  });

  it('validateTemplateTokens flags only unsupported tokens', () => {
    expect(validateTemplateTokens('{{customerName}} ok')).toEqual({ valid: true });
    const bad = validateTemplateTokens('{{customerName}} {{oops}}');
    expect(bad).toEqual({ valid: false, unsupported: ['oops'] });
  });
});
