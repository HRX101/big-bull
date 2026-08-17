import type { LeaveRequest, UserProfile } from '@car-spa/domain';
import { leaveRequestSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type { AuditRepository, LeaveRequestRepository, UserRepository } from '../ports';

export class CreateLeaveRequestUseCase {
  constructor(
    private readonly leaveRepo: LeaveRequestRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, employeeId: string): Promise<Result<LeaveRequest>> {
    const parsed = leaveRequestSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const leave = await this.leaveRepo.create({
        orgId,
        employeeId,
        fromDate: new Date(parsed.data.fromDate),
        toDate: new Date(parsed.data.toDate),
        reason: parsed.data.reason || null,
        status: 'PENDING',
        leaveType: parsed.data.leaveType,
        reviewedBy: null,
        reviewedAt: null,
      });

      await this.auditRepo.log({
        orgId,
        actorId: employeeId,
        action: 'leaveRequest.create',
        resourceType: 'leaveRequest',
        resourceId: leave.id,
      });

      return ok(leave);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create leave request'));
    }
  }
}

export class ReviewLeaveRequestUseCase {
  constructor(
    private readonly leaveRepo: LeaveRequestRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
    orgId: string,
    reviewerId: string,
  ): Promise<Result<LeaveRequest>> {
    try {
      const leave = await this.leaveRepo.findById(leaveId);
      if (!leave) {
        return err(new Error('Leave request not found'));
      }
      if (leave.orgId !== orgId) {
        return err(new Error('Leave request not found in this organization'));
      }
      if (leave.status !== 'PENDING') {
        return err(new Error('Leave request has already been reviewed'));
      }

      const updated = await this.leaveRepo.update(leaveId, {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      });

      await this.auditRepo.log({
        orgId,
        actorId: reviewerId,
        action: `leaveRequest.${status.toLowerCase()}`,
        resourceType: 'leaveRequest',
        resourceId: leaveId,
      });

      return ok(updated);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to review leave request'));
    }
  }
}

export class GetEmployeesUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(orgId: string): Promise<UserProfile[]> {
    return this.userRepo.findByOrgId(orgId);
  }
}
