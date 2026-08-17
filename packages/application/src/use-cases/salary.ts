import type { SalaryRecord } from '@car-spa/domain';
import { salaryRecordSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type {
  AuditRepository,
  LeaveRequestRepository,
  SalaryRecordRepository,
  UserRepository,
} from '../ports';

export function calculateSalary(
  fullSalary: number,
  workingDays: number,
  leaveDays: number,
): { perDayRate: number; deduction: number; payableAmount: number } {
  const perDayRate = fullSalary / workingDays;
  const deduction = leaveDays * perDayRate;
  const payableAmount = fullSalary - deduction;
  return {
    perDayRate: Math.round(perDayRate * 100) / 100,
    deduction: Math.round(deduction * 100) / 100,
    payableAmount: Math.round(payableAmount * 100) / 100,
  };
}

export class CreateSalaryRecordUseCase {
  constructor(
    private readonly salaryRepo: SalaryRecordRepository,
    private readonly leaveRepo: LeaveRequestRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<SalaryRecord>> {
    const parsed = salaryRecordSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const existing = await this.salaryRepo.findByEmployeeId(parsed.data.employeeId);
      const duplicate = existing.find(
        (s) => s.month === parsed.data.month && s.year === parsed.data.year,
      );
      if (duplicate) {
        return err(new Error('Salary record already exists for this month/year'));
      }

      const calculated = calculateSalary(
        parsed.data.fullSalary,
        parsed.data.workingDays,
        parsed.data.leaveDays,
      );

      const record = await this.salaryRepo.create({
        orgId,
        employeeId: parsed.data.employeeId,
        month: parsed.data.month,
        year: parsed.data.year,
        fullSalary: parsed.data.fullSalary,
        workingDays: parsed.data.workingDays,
        leaveDays: parsed.data.leaveDays,
        perDayRate: parsed.data.perDayRate ?? calculated.perDayRate,
        deduction: parsed.data.deduction ?? calculated.deduction,
        payableAmount: parsed.data.payableAmount ?? calculated.payableAmount,
        status: 'PENDING',
        receiptUrl: null,
        notes: parsed.data.notes || null,
        createdBy: actorId,
        approvedBy: null,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'salaryRecord.create',
        resourceType: 'salaryRecord',
        resourceId: record.id,
        metadata: { employeeId: parsed.data.employeeId, amount: record.payableAmount },
      });

      return ok(record);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create salary record'));
    }
  }
}

export class ApproveSalaryRecordUseCase {
  constructor(
    private readonly salaryRepo: SalaryRecordRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    salaryId: string,
    status: 'APPROVED' | 'PAID',
    orgId: string,
    actorId: string,
  ): Promise<Result<SalaryRecord>> {
    try {
      const record = await this.salaryRepo.findById(salaryId);
      if (!record) {
        return err(new Error('Salary record not found'));
      }
      if (record.orgId !== orgId) {
        return err(new Error('Salary record not found in this organization'));
      }

      const updated = await this.salaryRepo.update(salaryId, {
        status,
        approvedBy: actorId,
      });

      await this.auditRepo.log({
        orgId,
        actorId,
        action: `salaryRecord.${status.toLowerCase()}`,
        resourceType: 'salaryRecord',
        resourceId: salaryId,
        metadata: { employeeId: record.employeeId },
      });

      return ok(updated);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update salary record'));
    }
  }
}
