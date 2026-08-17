import type { Customer } from '@car-spa/domain';
import { customerSchema } from '@car-spa/domain';
import { err, ok, type Result } from '@car-spa/shared';
import type { AuditRepository, CustomerRepository } from '../ports';

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly auditRepo: AuditRepository,
  ) {}

  async execute(input: unknown, orgId: string, actorId: string): Promise<Result<Customer>> {
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.errors[0]?.message ?? 'Invalid input'));
    }
    try {
      const existing = await this.customerRepo.findByPhone(orgId, parsed.data.phone);
      if (existing) {
        return ok(existing);
      }
      const customer = await this.customerRepo.create({
        orgId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        totalSpend: 0,
        visitCount: 0,
      });
      await this.auditRepo.log({
        orgId,
        actorId,
        action: 'customer.create',
        resourceType: 'customer',
        resourceId: customer.id,
      });
      return ok(customer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create customer'));
    }
  }
}

export class SearchCustomersUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(orgId: string, query: string): Promise<Customer[]> {
    if (!query.trim()) {
      return this.customerRepo.findByOrgId(orgId, { limit: 20 });
    }
    return this.customerRepo.search(orgId, query);
  }
}
