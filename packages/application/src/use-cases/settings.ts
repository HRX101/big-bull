import type { StoreSettings } from '@car-spa/domain';
import { storeSettingsSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type { AuditRepository, StoreSettingsRepository } from '../ports';

export class GetStoreSettingsUseCase {
  constructor(private readonly settingsRepo: StoreSettingsRepository) {}

  async execute(orgId: string): Promise<StoreSettings | null> {
    return this.settingsRepo.findByOrgId(orgId);
  }
}

export class UpdateStoreSettingsUseCase {
  constructor(
    private readonly settingsRepo: StoreSettingsRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<StoreSettings>> {
    const parsed = storeSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const settings = await this.settingsRepo.upsert({
        orgId,
        storeName: parsed.data.storeName,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        gstin: parsed.data.gstin || null,
        taxRate: parsed.data.taxRate,
        logoUrl: parsed.data.logoUrl || null,
        whatsappProvider: parsed.data.whatsappProvider,
        whatsappApiKey:
          parsed.data.whatsappProvider === 'NONE' ? null : parsed.data.whatsappApiKey || null,
        whatsappPhoneNumberId:
          parsed.data.whatsappProvider === 'NONE'
            ? null
            : parsed.data.whatsappPhoneNumberId || null,
        whatsappTemplateId:
          parsed.data.whatsappProvider === 'NONE' ? null : parsed.data.whatsappTemplateId || null,
        whatsappTwilioFromNumber:
          parsed.data.whatsappProvider === 'TWILIO'
            ? parsed.data.whatsappTwilioFromNumber || null
            : null,
        workingDaysPerMonth: parsed.data.workingDaysPerMonth,
        defaultLeaveType: parsed.data.defaultLeaveType,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'storeSettings.update',
        resourceType: 'storeSettings',
        resourceId: settings.id,
      });

      return ok(settings);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update settings'));
    }
  }
}
