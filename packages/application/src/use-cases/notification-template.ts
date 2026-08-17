import type { StatusChangeNotificationTemplate } from '@car-spa/domain';
import { NOTIFICATION_PLACEHOLDERS, updateStatusChangeTemplateSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type { AuditRepository } from '../ports';
import type { NotificationTemplateRepository } from '../ports/whatsapp-provider.port';

export class GetNotificationTemplateUseCase {
  constructor(private readonly templateRepo: NotificationTemplateRepository) {}

  async execute(storeId: string): Promise<StatusChangeNotificationTemplate | null> {
    return this.templateRepo.findByOrgId(storeId);
  }
}

export class UpdateNotificationTemplateUseCase {
  constructor(
    private readonly templateRepo: NotificationTemplateRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    input: unknown,
    actorId: string,
  ): Promise<Result<StatusChangeNotificationTemplate>> {
    const parsed = updateStatusChangeTemplateSchema.safeParse({
      ...(typeof input === 'object' && input !== null ? input : {}),
      updatedBy: actorId,
    });
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }

    try {
      const template = await this.templateRepo.upsert({
        storeId: parsed.data.storeId,
        messageTemplate: parsed.data.messageTemplate,
        placeholders: [...NOTIFICATION_PLACEHOLDERS],
        updatedBy: actorId,
        updatedAt: new Date(),
      });

      await this.auditRepo.log({
        orgId: parsed.data.storeId,
        actorId,
        action: 'notificationTemplate.update',
        resourceType: 'notificationTemplate',
        resourceId: parsed.data.storeId,
        metadata: { messageTemplate: parsed.data.messageTemplate },
      });

      return ok(template);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update template'));
    }
  }
}
