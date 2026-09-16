import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InvoiceService } from '../billing/invoice.service';
import { Enrollment } from '../sis/enrollment.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';
import { EnrollmentHold } from '../sis/enrollment-hold.entity';
import { PromotionDecision } from '../sis/promotion-decision.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { Curriculum } from '../academic/curriculum.entity';

interface ReEnrollmentBatchParams {
  tenantId: string;
  sourceSchoolYearId: string;
  targetSchoolYearId: string;
  targetCurriculumId: string;
  createdBy: string;
  gradeLevelMapping: Record<string, string>; // source grade level ID -> target grade level ID
  includeHolds?: boolean;
  includeOutstandingBalances?: boolean;
}

export interface ReEnrollmentResult {
  totalStudents: number;
  enrolled: number;
  skipped: number;
  errors: Array<{ studentId: string; error: string }>;
  enrollments: Array<{ studentId: string; enrollmentId: string; gradeLevelId: string }>;
}

@Injectable()
export class ReEnrollmentService {
  private readonly logger = new Logger(ReEnrollmentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly invoiceService: InvoiceService,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(StudentSectionAssignment) private assignmentsRepo: Repository<StudentSectionAssignment>,
    @InjectRepository(EnrollmentHold) private holdsRepo: Repository<EnrollmentHold>,
    @InjectRepository(PromotionDecision) private promotionsRepo: Repository<PromotionDecision>,
    @InjectRepository(SchoolYear) private schoolYearsRepo: Repository<SchoolYear>,
    @InjectRepository(GradeLevel) private gradeLevelsRepo: Repository<GradeLevel>,
    @InjectRepository(Curriculum) private curriculaRepo: Repository<Curriculum>,
  ) {}

  /**
   * Get preview of what will be re-enrolled
   */
  async getReEnrollmentPreview(tenantId: string, sourceSchoolYearId: string) {
    // Get all active enrollments from source SY
    const enrollments = await this.enrollmentsRepo.find({
      where: { tenantId, schoolYearId: sourceSchoolYearId, status: 'enrolled' },
    });

    // Get promotion decisions
    const promotions = await this.promotionsRepo.find({
      where: { tenantId, schoolYearId: sourceSchoolYearId },
    });

    // Get holds
    const holdCounts: Record<string, number> = {};
    for (const enrollment of enrollments) {
      const holds = await this.holdsRepo.find({
        where: { studentId: enrollment.studentId, tenantId, isActive: true },
      });
      if (holds.length > 0) {
        holdCounts[enrollment.studentId] = holds.length;
      }
    }

    return {
      totalStudents: enrollments.length,
      withPromotionDecisions: promotions.length,
      withActiveHolds: Object.keys(holdCounts).length,
      holdDetails: holdCounts,
      gradeLevelBreakdown: this.groupByGradeLevel(enrollments),
    };
  }

  /**
   * Execute batch re-enrollment
   */
  async executeBatchReEnrollment(params: ReEnrollmentBatchParams): Promise<ReEnrollmentResult> {
    const result: ReEnrollmentResult = {
      totalStudents: 0,
      enrolled: 0,
      skipped: 0,
      errors: [],
      enrollments: [],
    };

    // Validate target SY exists and is in draft status
    const targetSY = await this.schoolYearsRepo.findOne({
      where: { id: params.targetSchoolYearId, tenantId: params.tenantId },
    });
    if (!targetSY) throw new BadRequestException('Target school year not found');
    if (targetSY.status !== 'draft') throw new BadRequestException('Target school year must be in draft status');

    // Get all active enrollments from source SY
    const sourceEnrollments = await this.enrollmentsRepo.find({
      where: { tenantId: params.tenantId, schoolYearId: params.sourceSchoolYearId, status: 'enrolled' },
    });

    result.totalStudents = sourceEnrollments.length;

    for (const sourceEnrollment of sourceEnrollments) {
      try {
        // Check for promotion decision
        const promotion = await this.promotionsRepo.findOne({
          where: {
            studentId: sourceEnrollment.studentId,
            schoolYearId: params.sourceSchoolYearId,
            tenantId: params.tenantId,
          },
        });

        // Determine target grade level
        let targetGradeLevelId = params.gradeLevelMapping[sourceEnrollment.gradeLevelId || ''];

        if (promotion && promotion.targetGradeLevelId) {
          // Use promotion decision if available
          targetGradeLevelId = promotion.targetGradeLevelId;
        }

        if (!targetGradeLevelId) {
          result.skipped++;
          result.errors.push({
            studentId: sourceEnrollment.studentId,
            error: 'No grade level mapping or promotion decision found',
          });
          continue;
        }

        // Check for blocking holds
        if (params.includeHolds !== false) {
          const holds = await this.holdsRepo.find({
            where: {
              studentId: sourceEnrollment.studentId,
              tenantId: params.tenantId,
              isActive: true,
              blocksSchedule: true,
            },
          });

          if (holds.length > 0) {
            result.skipped++;
            result.errors.push({
              studentId: sourceEnrollment.studentId,
              error: `Has ${holds.length} blocking hold(s)`,
            });
            continue;
          }
        }

        // Check for duplicate enrollment in target SY
        const existingEnrollment = await this.enrollmentsRepo.findOne({
          where: {
            studentId: sourceEnrollment.studentId,
            schoolYearId: params.targetSchoolYearId,
            tenantId: params.tenantId,
          },
        });

        if (existingEnrollment) {
          result.skipped++;
          result.errors.push({
            studentId: sourceEnrollment.studentId,
            error: 'Already enrolled in target school year',
          });
          continue;
        }

        // Create the enrollment atomically: the insert happens inside a
        // transaction whose first statement takes a row lock on the
        // student's enrollments, so concurrent batch runs (or a batch racing
        // a single enrollment) serialize here and the dup check + insert
        // pair can no longer both pass.
        const savedEnrollment = await this.dataSource.transaction(async (em) => {
          const txEnrollments = em.getRepository(Enrollment);

          await em.query(
            `SELECT id FROM enrollments WHERE "studentId" = $1 AND "tenantId" = $2 FOR UPDATE`,
            [sourceEnrollment.studentId, params.tenantId],
          );

          const dupe = await txEnrollments.findOne({
            where: {
              studentId: sourceEnrollment.studentId,
              schoolYearId: params.targetSchoolYearId,
              tenantId: params.tenantId,
            },
          });
          if (dupe) throw new Error('Already enrolled in target school year');

          const newEnrollment = txEnrollments.create({
            tenantId: params.tenantId,
            branchId: sourceEnrollment.branchId,
            studentId: sourceEnrollment.studentId,
            schoolYearId: params.targetSchoolYearId,
            curriculumId: params.targetCurriculumId,
            gradeLevelId: targetGradeLevelId,
            strandId: sourceEnrollment.strandId,
            programId: sourceEnrollment.programId,
            previousSchoolYearId: params.sourceSchoolYearId,
            previousGradeLevelId: sourceEnrollment.gradeLevelId,
            status: 'enrolled',
          });
          return txEnrollments.save(newEnrollment);
        });

        // Auto-assess fees from the resolved fee structure — after commit,
        // same as SisService.createEnrollment (InvoiceService runs on its
        // own connection, so it must see the committed enrollment row).
        // A billing configuration problem must not lose the enrollment;
        // invoice failures are logged and the invoice can be generated
        // manually afterwards.
        try {
          await this.invoiceService.generateInvoice({
            tenantId: savedEnrollment.tenantId,
            branchId: savedEnrollment.branchId,
            studentId: savedEnrollment.studentId,
            enrollmentId: savedEnrollment.id,
          });
        } catch (e) {
          this.logger.warn(
            `Auto-invoice failed for re-enrolled student ${savedEnrollment.studentId}: ${e instanceof Error ? e.message : e}`,
          );
        }

        result.enrolled++;
        result.enrollments.push({
          studentId: sourceEnrollment.studentId,
          enrollmentId: savedEnrollment.id,
          gradeLevelId: targetGradeLevelId,
        });

      } catch (error: any) {
        result.errors.push({
          studentId: sourceEnrollment.studentId,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Carry forward outstanding balances (placeholder - billing integration needed)
   */
  async carryForwardBalances(tenantId: string, sourceSchoolYearId: string, targetSchoolYearId: string) {
    // This would integrate with the billing module in Phase 6
    // For now, return a summary
    const enrollments = await this.enrollmentsRepo.find({
      where: { tenantId, schoolYearId: sourceSchoolYearId, status: 'enrolled' },
    });

    return {
      studentsProcessed: enrollments.length,
      message: 'Balance carry-forward requires Phase 6 billing module integration',
    };
  }

  private groupByGradeLevel(enrollments: Enrollment[]) {
    const groups: Record<string, number> = {};
    for (const e of enrollments) {
      const key = e.gradeLevelId || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }
}
