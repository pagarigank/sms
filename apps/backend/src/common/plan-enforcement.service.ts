import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { TenantPlan } from '../tenants/tenant-plan.entity';

@Injectable()
export class PlanEnforcementService {
  constructor(
    @InjectRepository(Tenant) private tenantsRepo: Repository<Tenant>,
    @InjectRepository(TenantPlan) private plansRepo: Repository<TenantPlan>,
  ) {}

  /**
   * Check if a tenant can create more branches within their plan limits.
   */
  async canCreateBranch(tenantId: string): Promise<{ allowed: boolean; current: number; max: number | null }> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const plan = await this.plansRepo.findOne({ where: { id: tenant.planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    // Count current branches (this is simplified; in production, use a counter)
    const branchCount = await this.tenantsRepo
      .createQueryBuilder('t')
      .innerJoin('branches', 'b', 'b.tenant_id = t.id')
      .where('t.id = :tenantId', { tenantId })
      .getCount();

    const max = plan.maxBranches;
    const allowed = max === null || branchCount < max;

    return { allowed, current: branchCount, max };
  }

  /**
   * Check if a tenant can enroll more students within their plan limits.
   */
  async canEnrollStudent(tenantId: string): Promise<{ allowed: boolean; current: number; max: number | null }> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const plan = await this.plansRepo.findOne({ where: { id: tenant.planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    // Count current students
    const studentCount = await this.tenantsRepo
      .createQueryBuilder('t')
      .innerJoin('enrollments', 'e', 'e.tenant_id = t.id')
      .where('t.id = :tenantId', { tenantId })
      .getCount();

    const max = plan.maxStudents;
    const allowed = max === null || studentCount < max;

    return { allowed, current: studentCount, max };
  }

  /**
   * Check if a tenant has a specific module enabled.
   */
  async hasModule(tenantId: string, moduleName: string): Promise<boolean> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return false;

    const plan = await this.plansRepo.findOne({ where: { id: tenant.planId } });
    if (!plan) return false;

    const modules = plan.modules as Record<string, boolean>;
    return modules[moduleName] === true;
  }

  /**
   * Enforce branch creation limit.
   */
  async enforceBranchLimit(tenantId: string): Promise<void> {
    const check = await this.canCreateBranch(tenantId);
    if (!check.allowed) {
      throw new BadRequestException(
        `Branch limit reached: ${check.current}/${check.max}. Upgrade your plan to add more branches.`
      );
    }
  }

  /**
   * Enforce student enrollment limit.
   */
  async enforceStudentLimit(tenantId: string): Promise<void> {
    const check = await this.canEnrollStudent(tenantId);
    if (!check.allowed) {
      throw new BadRequestException(
        `Student limit reached: ${check.current}/${check.max}. Upgrade your plan to enroll more students.`
      );
    }
  }

  /**
   * Get usage metrics for a tenant.
   */
  async getUsageMetrics(tenantId: string) {
    const [branchCheck, studentCheck] = await Promise.all([
      this.canCreateBranch(tenantId),
      this.canEnrollStudent(tenantId),
    ]);

    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    const plan = tenant ? await this.plansRepo.findOne({ where: { id: tenant.planId } }) : null;

    return {
      plan: plan?.name || 'Unknown',
      branches: { current: branchCheck.current, max: branchCheck.max },
      students: { current: studentCheck.current, max: studentCheck.max },
      modules: plan?.modules || {},
    };
  }
}
