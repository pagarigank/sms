import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeType } from './fee-type.entity';
import { FeeStructure } from './fee-structure.entity';
import { FeeStructureItem } from './fee-structure-item.entity';
import { DiscountType } from './discount-type.entity';
import { StudentDiscountGrant } from './student-discount-grant.entity';
import { PaymentPlan } from './payment-plan.entity';
import { InstallmentSchedule } from './installment-schedule.entity';
import { PenaltyRule } from './penalty-rule.entity';
import { WithdrawalPolicy } from './withdrawal-policy.entity';
import { Invoice } from './invoice.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { Subject } from '../academic/subject.entity';
import { EnrollmentSubject } from '../sis/enrollment-subject.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(FeeType) private feeTypesRepo: Repository<FeeType>,
    @InjectRepository(FeeStructure) private feeStructuresRepo: Repository<FeeStructure>,
    @InjectRepository(FeeStructureItem) private feeStructureItemsRepo: Repository<FeeStructureItem>,
    @InjectRepository(DiscountType) private discountTypesRepo: Repository<DiscountType>,
    @InjectRepository(StudentDiscountGrant) private discountGrantsRepo: Repository<StudentDiscountGrant>,
    @InjectRepository(PaymentPlan) private paymentPlansRepo: Repository<PaymentPlan>,
    @InjectRepository(InstallmentSchedule) private installmentRepo: Repository<InstallmentSchedule>,
    @InjectRepository(PenaltyRule) private penaltyRulesRepo: Repository<PenaltyRule>,
    @InjectRepository(WithdrawalPolicy) private withdrawalPoliciesRepo: Repository<WithdrawalPolicy>,
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(SchoolYear) private schoolYearsRepo: Repository<SchoolYear>,
    @InjectRepository(Curriculum) private curriculaRepo: Repository<Curriculum>,
    @InjectRepository(Subject) private subjectsRepo: Repository<Subject>,
    @InjectRepository(EnrollmentSubject) private enrollmentSubjectsRepo: Repository<EnrollmentSubject>,
  ) {}

  // === Fee Types ===
  async getFeeTypes(tenantId: string, isActive?: boolean) {
    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;
    return this.feeTypesRepo.find({ where, order: { code: 'ASC' } });
  }

  async createFeeType(data: Partial<FeeType>) {
    const feeType = this.feeTypesRepo.create(data);
    return this.feeTypesRepo.save(feeType);
  }

  async updateFeeType(id: string, tenantId: string, data: Partial<FeeType>) {
    const feeType = await this.feeTypesRepo.findOne({ where: { id, tenantId } });
    if (!feeType) throw new NotFoundException('Fee type not found');
    Object.assign(feeType, data);
    return this.feeTypesRepo.save(feeType);
  }

  async removeFeeType(id: string, tenantId: string) {
    const feeType = await this.feeTypesRepo.findOne({ where: { id, tenantId } });
    if (!feeType) throw new NotFoundException('Fee type not found');
    try {
      await this.feeTypesRepo.remove(feeType);
    } catch {
      // fee_structure_items reference this type — soft-retire instead
      await this.feeTypesRepo.update(id, { isActive: false });
      return { softDeleted: true, feeType: { ...feeType, isActive: false } };
    }
    return { softDeleted: false };
  }

  // === Fee Structures ===
  async getFeeStructures(tenantId: string, params?: { branchId?: string; schoolYearId?: string; educationLevelId?: string }) {
    const where: any = { tenantId };
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.schoolYearId) where.schoolYearId = params.schoolYearId;
    if (params?.educationLevelId) where.educationLevelId = params.educationLevelId;
    return this.feeStructuresRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createFeeStructure(data: Partial<FeeStructure>) {
    const structure = this.feeStructuresRepo.create(data);
    return this.feeStructuresRepo.save(structure);
  }

  async getFeeStructureItems(feeStructureId: string, tenantId: string) {
    return this.feeStructureItemsRepo.find({ where: { feeStructureId, tenantId }, order: { sortOrder: 'ASC' } });
  }

  async addFeeStructureItem(data: Partial<FeeStructureItem>) {
    const item = this.feeStructureItemsRepo.create(data);
    return this.feeStructureItemsRepo.save(item);
  }

  async updateFeeStructureItem(id: string, tenantId: string, data: Partial<FeeStructureItem>) {
    const item = await this.feeStructureItemsRepo.findOne({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Fee structure item not found');
    Object.assign(item, data);
    return this.feeStructureItemsRepo.save(item);
  }

  async deleteFeeStructureItem(id: string, tenantId: string) {
    await this.feeStructureItemsRepo.delete({ id, tenantId });
  }

  // === Enrollment lookup for invoice generation ===
  async getEnrollment(tenantId: string, enrollmentId: string): Promise<Enrollment | null> {
    return this.enrollmentsRepo.findOne({ where: { id: enrollmentId, tenantId } });
  }

  /** Enrollments reference their education level through the curriculum. */
  async getEducationLevelForCurriculum(curriculumId: string): Promise<string | undefined> {
    const curriculum = await this.curriculaRepo.findOne({ where: { id: curriculumId } });
    return curriculum?.educationLevelId ?? undefined;
  }

  // === Fee Structure Resolution (override-by-shadow-row pattern) ===
  // Candidates must be compatible with the request: a structure that specifies a
  // dimension (branch/term/level/grade/strand/program) only matches when the
  // request supplies the SAME value. `undefined === undefined` must never count
  // as a match (that bug made the least-specific structure win arbitrarily).
  // Among compatible candidates, the most specific match wins.
  async resolveFeeStructure(tenantId: string, params: {
    enrollmentId?: string;
    branchId?: string;
    schoolYearId: string;
    educationLevelId?: string;
    gradeLevelId?: string;
    strandId?: string;
    programId?: string;
    termId?: string;
  }) {
    const candidates = await this.feeStructuresRepo.find({
      where: { tenantId, schoolYearId: params.schoolYearId, status: 'active' },
    });

    const matchesDimension = (structuralValue: string | null | undefined, requested?: string) => {
      if (!structuralValue) return true; // structure doesn't care about this dimension
      return !!requested && structuralValue === requested;
    };

    const compatible = candidates.filter(
      (c) =>
        matchesDimension(c.branchId, params.branchId) &&
        matchesDimension(c.termId, params.termId) &&
        matchesDimension(c.educationLevelId, params.educationLevelId) &&
        matchesDimension(c.gradeLevelId, params.gradeLevelId) &&
        matchesDimension(c.strandId, params.strandId) &&
        matchesDimension(c.programId, params.programId),
    );

    if (compatible.length === 0) return null;

    // Specificity = how many dimensions the structure pins down that also match
    // the request. More pinned dimensions → more specific → preferred.
    const specificity = (c: typeof compatible[number]) =>
      [
        [c.branchId, params.branchId],
        [c.termId, params.termId],
        [c.educationLevelId, params.educationLevelId],
        [c.gradeLevelId, params.gradeLevelId],
        [c.strandId, params.strandId],
        [c.programId, params.programId],
      ].reduce((n, [sv, rv]) => n + (sv && rv && sv === rv ? 1 : 0), 0);

    compatible.sort(
      (a, b) => specificity(b) - specificity(a) || b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    const bestMatch = compatible[0];
    const items = await this.getFeeStructureItems(bestMatch.id, tenantId);

    let totalUnits = 0;
    if (params.enrollmentId) {
      const enrolledSubjects = await this.enrollmentSubjectsRepo.find({
        where: { tenantId, enrollmentId: params.enrollmentId }
      });
      if (enrolledSubjects.length > 0) {
        // Need to import In from typeorm at the top of the file, let me do that separately.
        const subjectIds = enrolledSubjects.map(es => es.subjectId);
        const subjects = await this.subjectsRepo.createQueryBuilder('subject')
          .where('subject.id IN (:...subjectIds)', { subjectIds })
          .andWhere('subject.tenantId = :tenantId', { tenantId })
          .getMany();
        totalUnits = subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);
      }
    }

    const resolvedItems = items.map(item => {
      if (item.isPerUnit) {
        // If they have 0 units (e.g. no subjects loaded yet but structure is resolved), default multiplier to 1 to show base rate, or maybe 0?
        // Actually, if it's per-unit, and they have 0 units, they shouldn't be charged tuition. So multiply by totalUnits (even if 0).
        return { ...item, amount: Number(item.amount) * Math.max(totalUnits, 0) };
      }
      return item;
    });

    return {
      structure: bestMatch,
      items: resolvedItems,
      totalAmount: resolvedItems.reduce((sum, item) => sum + Number(item.amount), 0),
    };
  }

  // === Discount Types ===
  async getDiscountTypes(tenantId: string) {
    return this.discountTypesRepo.find({ where: { tenantId, isActive: true } });
  }

  async createDiscountType(data: Partial<DiscountType>) {
    const discountType = this.discountTypesRepo.create(data);
    return this.discountTypesRepo.save(discountType);
  }

  // === Discount Grants ===
  async getDiscountGrants(tenantId: string, studentId?: string) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.discountGrantsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createDiscountGrant(data: Partial<StudentDiscountGrant>) {
    const grant = this.discountGrantsRepo.create(data);
    return this.discountGrantsRepo.save(grant);
  }

  async approveDiscountGrant(id: string, tenantId: string, approvedBy: string) {
    const grant = await this.discountGrantsRepo.findOne({ where: { id, tenantId } });
    if (!grant) throw new NotFoundException('Discount grant not found');
    grant.status = 'approved';
    grant.approvedByUserId = approvedBy;
    grant.approvedAt = new Date();
    return this.discountGrantsRepo.save(grant);
  }

  // === Payment Plans ===
  async getPaymentPlans(tenantId: string) {
    return this.paymentPlansRepo.find({ where: { tenantId, isActive: true } });
  }

  async createPaymentPlan(data: Partial<PaymentPlan>) {
    const plan = this.paymentPlansRepo.create(data);
    return this.paymentPlansRepo.save(plan);
  }

  async updatePaymentPlan(id: string, tenantId: string, data: Partial<PaymentPlan>) {
    const plan = await this.paymentPlansRepo.findOne({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('Payment plan not found');
    Object.assign(plan, data);
    return this.paymentPlansRepo.save(plan);
  }

  async deletePaymentPlan(id: string, tenantId: string) {
    const plan = await this.paymentPlansRepo.findOne({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('Payment plan not found');
    
    // Check if used in invoices (soft delete if true)
    const count = await this.invoicesRepo.count({ where: { paymentPlanId: id, tenantId } });
    if (count > 0) {
      plan.isActive = false;
      return this.paymentPlansRepo.save(plan);
    }
    
    return this.paymentPlansRepo.remove(plan);
  }

  async getInstallmentSchedule(invoiceId: string, tenantId: string) {
    return this.installmentRepo.find({ where: { invoiceId, tenantId }, order: { installmentNumber: 'ASC' } });
  }

  // === Penalty Rules ===
  async getPenaltyRules(tenantId: string) {
    return this.penaltyRulesRepo.find({ where: { tenantId, isActive: true } });
  }

  async createPenaltyRule(data: Partial<PenaltyRule>) {
    const rule = this.penaltyRulesRepo.create(data);
    return this.penaltyRulesRepo.save(rule);
  }

  async computePenalty(tenantId: string, invoiceId: string) {
    const rules = await this.penaltyRulesRepo.find({ where: { tenantId, isActive: true } });
    if (rules.length === 0) return { penaltyAmount: 0, rule: null };

    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice || !invoice.dueDate) return { penaltyAmount: 0, rule: rules[0] };
    const outstanding = Number(invoice.balance);
    if (outstanding <= 0) return { penaltyAmount: 0, rule: rules[0] };

    const rule = rules[0];
    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    ) - Number(rule.gracePeriodDays || 0);
    if (daysOverdue <= 0) return { penaltyAmount: 0, rule };

    let penalty: number;
    if (rule.computationType === 'fixed') {
      penalty = Number(rule.penaltyFixedAmount || 0);
    } else {
      // daily: penaltyPercentage per day on the outstanding balance
      penalty = (outstanding * Number(rule.penaltyPercentage || 0) / 100) * daysOverdue;
    }
    if (Number(rule.maxPenaltyAmount) > 0) {
      penalty = Math.min(penalty, Number(rule.maxPenaltyAmount));
    }
    return { penaltyAmount: Math.round(penalty * 100) / 100, rule, daysOverdue };
  }

  // === Withdrawal Policies ===
  async getWithdrawalPolicies(tenantId: string) {
    return this.withdrawalPoliciesRepo.find({ where: { tenantId, isActive: true }, order: { withinDays: 'ASC' } });
  }

  async createWithdrawalPolicy(data: Partial<WithdrawalPolicy>) {
    const policy = this.withdrawalPoliciesRepo.create(data);
    return this.withdrawalPoliciesRepo.save(policy);
  }

  async computeRefund(tenantId: string, enrollmentId: string, withdrawalDate: Date) {
    const policies = await this.withdrawalPoliciesRepo.find({ where: { tenantId, isActive: true }, order: { withinDays: 'DESC' } });
    if (policies.length === 0) return { refundPercentage: 0, policy: null, proRatedAmount: 0 };

    const enrollment = await this.enrollmentsRepo.findOne({ where: { id: enrollmentId, tenantId } });
    if (!enrollment) return { refundPercentage: 0, policy: null, proRatedAmount: 0 };

    const daysElapsed = Math.max(
      0,
      Math.floor((new Date(withdrawalDate).getTime() - new Date(enrollment.enrolledAt).getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Brackets: the policy with the largest withinDays <= daysElapsed applies.
    const policy = policies.find((p) => daysElapsed <= Number(p.withinDays));
    if (!policy) return { refundPercentage: 0, policy: null, proRatedAmount: 0, daysElapsed };

    let refundPercentage = Number(policy.refundPercentage);
    let proRatedAmount = 0;

    if (policy.isProRated) {
      // Pro-rate by remaining share of the school year
      const sy = await this.schoolYearsRepo.findOne({ where: { id: enrollment.schoolYearId } });
      if (sy?.startDate && sy?.endDate) {
        const total = new Date(sy.endDate).getTime() - new Date(sy.startDate).getTime();
        if (total > 0) {
          const remaining = Math.max(0, new Date(sy.endDate).getTime() - new Date(withdrawalDate).getTime());
          refundPercentage = Math.min(100, (remaining / total) * 100);
        }
      }
    }

    // Refund base = what the student has actually paid for this enrollment
    const invoices = await this.invoicesRepo.find({ where: { tenantId, enrollmentId } });
    const paid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    proRatedAmount = Math.round((paid * refundPercentage / 100) * 100) / 100;

    return { refundPercentage: Math.round(refundPercentage * 100) / 100, policy, proRatedAmount, daysElapsed };
  }
}
