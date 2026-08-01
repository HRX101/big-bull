import type { Mechanic, MechanicLedgerEntry } from '@car-spa/domain';
import { mechanicLedgerEntrySchema, mechanicSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type { AuditRepository, MechanicLedgerRepository, MechanicRepository } from '../ports';

export class CreateMechanicUseCase {
  constructor(
    private readonly mechanicRepo: MechanicRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    input: unknown,
    orgId: string,
    actorId: string,
  ): Promise<Result<Mechanic>> {
    const parsed = mechanicSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const mechanic = await this.mechanicRepo.create({
        orgId,
        name: parsed.data.name,
        storeName: parsed.data.storeName,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        balance: 0,
        active: true,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'mechanic.create',
        resourceType: 'mechanic',
        resourceId: mechanic.id,
      });

      return ok(mechanic);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to create mechanic'),
      );
    }
  }
}

export class AddMechanicLedgerEntryUseCase {
  constructor(
    private readonly mechanicRepo: MechanicRepository,
    private readonly ledgerRepo: MechanicLedgerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    input: unknown,
    orgId: string,
    actorId: string,
  ): Promise<Result<MechanicLedgerEntry>> {
    const parsed = mechanicLedgerEntrySchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const mechanic = await this.mechanicRepo.findById(parsed.data.mechanicId);
      if (!mechanic) {
        return err(new Error('Mechanic not found'));
      }

      const delta =
        parsed.data.type === 'DEBIT' ? parsed.data.amount : -parsed.data.amount;

      await this.mechanicRepo.updateBalance(mechanic.id, delta);

      const entry = await this.ledgerRepo.create({
        orgId,
        mechanicId: parsed.data.mechanicId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        referenceType: null,
        referenceId: null,
        itemCount: parsed.data.itemCount ?? null,
        actorId,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'mechanicLedger.create',
        resourceType: 'mechanicLedgerEntry',
        resourceId: entry.id,
        metadata: { mechanicId: mechanic.id, type: parsed.data.type, amount: parsed.data.amount },
      });

      return ok(entry);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Failed to add ledger entry'),
      );
    }
  }
}
