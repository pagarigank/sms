import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReportTemplate } from './report-template.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { Student } from '../sis/student.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { Invoice } from '../billing/invoice.entity';
import { Payment } from '../cashiering/payment.entity';
import { AttendanceRecord } from '../scheduling/attendance-record.entity';
import { CalendarEvent } from '../scheduling/calendar-event.entity';
import { Building } from '../facility/building.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { Subject } from '../academic/subject.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { EducationLevel } from '../education-levels/education-level.entity';
import { DiscountType } from '../billing/discount-type.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(ReportTemplate) private templatesRepo: Repository<ReportTemplate>,
    @InjectRepository(ScheduledReport) private scheduledRepo: Repository<ScheduledReport>,
  ) {}

  /**
   * Dashboard aggregation.
   *
   * NOTE on columns: the live schema uses TypeORM camelCase column names
   * (e.g. `"tenantId"`), so every reference below is quoted camelCase.
   *
   * Contract (both shapes are returned for compatibility):
   *  - flat:   buildings, schoolYears, curricula, subjects, activeStudents,
   *            totalStudents, pendingEnrollments, totalEnrollments,
   *            revenueThisMonth, pendingPayments, upcomingEvents, attendanceRate
   *  - nested: students {total, active}, enrollments {total, pending},
   *            financial {totalInvoiced, totalPaid, totalBalance, revenueSince},
   *            attendance {today, rate}, payments {today}, events {upcoming}
   */
  async getDashboardStats(
    tenantId: string,
    branchId?: string,
    range: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    const m = this.templatesRepo.manager;

    // ---- Students -----------------------------------------------------------
    const studentQb = m.createQueryBuilder(Student, 's').where('s."tenantId" = :tenantId', { tenantId });
    if (branchId) studentQb.andWhere('s."branchId" = :branchId', { branchId });
    const totalStudents = await studentQb.getCount();
    const activeStudents = await studentQb
      .clone()
      .andWhere('s."status" = :status', { status: 'active' })
      .getCount();

    // ---- Enrollments --------------------------------------------------------
    const enrollQb = m.createQueryBuilder(Enrollment, 'e').where('e."tenantId" = :tenantId', { tenantId });
    if (branchId) enrollQb.andWhere('e."branchId" = :branchId', { branchId });
    const totalEnrollments = await enrollQb.getCount();
    const pendingEnrollments = await enrollQb
      .clone()
      .andWhere('e."status" = :status', { status: 'pending' })
      .getCount();

    // ---- Buildings / curriculum scaffolding ---------------------------------
    const buildingQb = m.createQueryBuilder(Building, 'b').where('b."tenantId" = :tenantId', { tenantId });
    if (branchId) buildingQb.andWhere('b."branchId" = :branchId', { branchId });
    const buildings = await buildingQb.getCount();

    const schoolYears = await m.createQueryBuilder(SchoolYear, 'sy').where('sy."tenantId" = :tenantId', { tenantId }).getCount();
    const curricula = await m
      .createQueryBuilder(Curriculum, 'c')
      .where('c."tenantId" = :tenantId', { tenantId })
      .andWhere(branchId ? 'c."branchId" = :branchId' : '1=1', { branchId })
      .getCount();
    const subjects = await m.createQueryBuilder(Subject, 'sub').where('sub."tenantId" = :tenantId', { tenantId }).getCount();

    // ---- Financial ----------------------------------------------------------
    // "range" drives the revenue window (this week/month/quarter/year).
    const now = new Date();
    const since = new Date(now);
    if (range === 'week') since.setDate(now.getDate() - 7);
    else if (range === 'month') since.setMonth(now.getMonth() - 1);
    else if (range === 'quarter') since.setMonth(now.getMonth() - 3);
    else since.setFullYear(now.getFullYear() - 1);

    const invoiceQb = m.createQueryBuilder(Invoice, 'i').where('i."tenantId" = :tenantId', { tenantId });
    if (branchId) invoiceQb.andWhere('i."branchId" = :branchId', { branchId });

    const totalInvoicedRaw = await invoiceQb
      .clone()
      .select('COALESCE(SUM(i."totalAmount"), 0)', 'total')
      .getRawOne();
    const totalPaidRaw = await invoiceQb
      .clone()
      .select('COALESCE(SUM(i."paidAmount"), 0)', 'total')
      .getRawOne();
    const totalBalanceRaw = await invoiceQb
      .clone()
      .andWhere('i."balance" > 0')
      .select('COALESCE(SUM(i."balance"), 0)', 'total')
      .getRawOne();
    const pendingPayments = await invoiceQb.clone().andWhere('i."balance" > 0').getCount();

    const paymentQb = m
      .createQueryBuilder(Payment, 'p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."status" = :status', { status: 'completed' });
    if (branchId) paymentQb.andWhere('p."branchId" = :branchId', { branchId });

    const revenueSinceRaw = await paymentQb
      .clone()
      .andWhere('p."paidAt" >= :since', { since: since.toISOString() })
      .select('COALESCE(SUM(p."amount"), 0)', 'total')
      .getRawOne();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const paymentsTodayRaw = await paymentQb
      .clone()
      .andWhere('p."paidAt" >= :todayStart', { todayStart: todayStart.toISOString() })
      .select('COALESCE(SUM(p."amount"), 0)', 'total')
      .getRawOne();

    // ---- Attendance (today's rate) -------------------------------------------
    const attendanceQb = m.createQueryBuilder(AttendanceRecord, 'ar').where('ar."tenantId" = :tenantId', { tenantId });
    const attendanceToday = await attendanceQb
      .clone()
      .andWhere('ar."attendanceDate" = :today', { today: todayStart.toISOString().split('T')[0] })
      .getCount();
    const attendancePresent = await attendanceQb
      .clone()
      .andWhere('ar."attendanceDate" = :today', { today: todayStart.toISOString().split('T')[0] })
      .andWhere('ar."status" IN (:...presentStatuses)', { presentStatuses: ['present', 'late', 'excused'] })
      .getCount();
    const attendanceRate = attendanceToday > 0 ? Math.round((attendancePresent / attendanceToday) * 100) : 0;

    // ---- Upcoming calendar events (next 14 days) ------------------------------
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingEvents = await m
      .createQueryBuilder(CalendarEvent, 'ce')
      .where('ce."tenantId" = :tenantId', { tenantId })
      .andWhere('ce."startDate" BETWEEN :today AND :horizon', {
        today: todayStart.toISOString().split('T')[0],
        horizon: horizon.toISOString().split('T')[0],
      })
      .getCount();

    return {
      // flat shape (used by school-portal dashboard)
      buildings,
      schoolYears,
      curricula,
      subjects,
      totalStudents,
      activeStudents,
      totalEnrollments,
      pendingEnrollments,
      totalInvoiced: Number(totalInvoicedRaw?.total || 0),
      totalPaid: Number(totalPaidRaw?.total || 0),
      totalBalance: Number(totalBalanceRaw?.total || 0),
      pendingPayments,
      revenueSince: Number(revenueSinceRaw?.total || 0),
      revenueThisMonth: Number(revenueSinceRaw?.total || 0),
      paymentsToday: Number(paymentsTodayRaw?.total || 0),
      attendanceToday,
      attendanceRate,
      upcomingEvents,
      // nested shape (backwards compatible)
      students: { total: totalStudents, active: activeStudents },
      enrollments: { total: totalEnrollments, pending: pendingEnrollments },
      financial: {
        totalInvoiced: Number(totalInvoicedRaw?.total || 0),
        totalPaid: Number(totalPaidRaw?.total || 0),
        totalBalance: Number(totalBalanceRaw?.total || 0),
        revenueSince: Number(revenueSinceRaw?.total || 0),
      },
      attendance: { today: attendanceToday, rate: attendanceRate },
      payments: { today: Number(paymentsTodayRaw?.total || 0) },
      events: { upcoming: upcomingEvents },
    };
  }

  // === Enrollment Reports ===
  async getEnrollmentReport(tenantId: string, params: { schoolYearId?: string; branchId?: string; gradeLevelId?: string }) {
    const m = this.templatesRepo.manager;
    const qb = m
      .createQueryBuilder(Enrollment, 'e')
      .where('e."tenantId" = :tenantId', { tenantId });

    if (params.schoolYearId) qb.andWhere('e."schoolYearId" = :syId', { syId: params.schoolYearId });
    if (params.branchId) qb.andWhere('e."branchId" = :brId', { brId: params.branchId });
    if (params.gradeLevelId) qb.andWhere('e."gradeLevelId" = :glId', { glId: params.gradeLevelId });

    const total = await qb.getCount();

    const byStatus = await qb
      .clone()
      .select('e."status"', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e."status"')
      .getRawMany();

    const byGradeLevel = await qb
      .clone()
      .select('e."gradeLevelId"', 'gradeLevelId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e."gradeLevelId"')
      .getRawMany();

    // Resolve grade-level names so the portal shows "Grade 8", not UUIDs.
    // Falls back to education levels because seeded enrollments reference
    // education-level ids in the gradeLevelId column.
    const gradeLevelIds = byGradeLevel.map((r) => r.gradeLevelId).filter(Boolean);
    const [gradeLevels, eduLevels] = await Promise.all([
      gradeLevelIds.length ? m.getRepository(GradeLevel).find({ where: { id: In(gradeLevelIds) } }) : [],
      gradeLevelIds.length ? m.getRepository(EducationLevel).find({ where: { id: In(gradeLevelIds) } }) : [],
    ]);
    const gradeNameById = new Map<string, string>([
      ...gradeLevels.map((g): [string, string] => [g.id, g.name]),
      ...eduLevels.map((e): [string, string] => [e.id, e.name]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, r) => { acc[r.status ?? 'unknown'] = parseInt(r.count, 10); return acc; }, {} as Record<string, number>),
      byGradeLevel: byGradeLevel.map((r) => ({
        gradeLevelId: r.gradeLevelId,
        gradeLevelName: gradeNameById.get(r.gradeLevelId) ?? 'Unassigned',
        count: parseInt(r.count, 10),
      })),
    };
  }

  // === Revenue Reports ===
  async getRevenueReport(tenantId: string, params: { startDate?: string; endDate?: string; branchId?: string }) {
    const m = this.templatesRepo.manager;
    const qb = m
      .createQueryBuilder(Payment, 'p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."status" = :status', { status: 'completed' });

    if (params.startDate) qb.andWhere('p."paidAt" >= :start', { start: params.startDate });
    if (params.endDate) qb.andWhere('p."paidAt" <= :end', { end: params.endDate });
    if (params.branchId) qb.andWhere('p."branchId" = :brId', { brId: params.branchId });

    const totalRevenue = await qb.clone().select('COALESCE(SUM(p."amount"), 0)', 'total').getRawOne();

    const byMethod = await qb
      .clone()
      .select('p."method"', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(p."amount")', 'total')
      .groupBy('p."method"')
      .getRawMany();

    const dailyTrend = await qb
      .clone()
      .select('DATE(p."paidAt")', 'date')
      .addSelect('SUM(p."amount")', 'total')
      .groupBy('DATE(p."paidAt")')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      totalRevenue: Number(totalRevenue?.total || 0),
      byMethod: byMethod.map((r) => ({ method: r.method, count: parseInt(r.count, 10), total: Number(r.total) })),
      dailyTrend: dailyTrend.map((r) => ({ date: r.date, total: Number(r.total) })),
    };
  }

  // === AR Aging Report ===
  async getARAgingReport(tenantId: string, branchId?: string) {
    const m = this.templatesRepo.manager;
    const qb = m
      .createQueryBuilder(Invoice, 'i')
      .where('i."tenantId" = :tenantId', { tenantId })
      .andWhere('i."balance" > 0');

    if (branchId) qb.andWhere('i."branchId" = :brId', { brId: branchId });

    const invoices = await qb.getMany();
    const now = new Date();

    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    let totalOutstanding = 0;
    let invoiceCount = 0;

    for (const inv of invoices) {
      if (!inv.dueDate) continue;
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balance = Number(inv.balance);

      if (daysOverdue <= 0) aging.current += balance;
      else if (daysOverdue <= 30) aging.days30 += balance;
      else if (daysOverdue <= 60) aging.days60 += balance;
      else if (daysOverdue <= 90) aging.days90 += balance;
      else aging.over90 += balance;

      totalOutstanding += balance;
      invoiceCount++;
    }

    return { aging, totalOutstanding, invoiceCount };
  }

  // === Discount Utilization Report ===
  async getDiscountReport(tenantId: string) {
    const grants = await this.templatesRepo.manager
      .createQueryBuilder('student_discount_grants', 'sdg')
      .where('sdg."tenantId" = :tenantId', { tenantId })
      .getMany();

    const byType: Record<string, number> = {};
    for (const grant of grants) {
      const typeId = (grant as any).discountTypeId || 'unknown';
      byType[typeId] = (byType[typeId] || 0) + 1;
    }

    // Resolve discount-type names for display.
    const typeIds = Object.keys(byType).filter((id) => id !== 'unknown');
    const types = typeIds.length ? await this.templatesRepo.manager.getRepository(DiscountType).find({ where: { id: In(typeIds) } }) : [];
    const typeNameById = new Map(types.map((t) => [t.id, t.name]));

    return {
      totalGrants: grants.length,
      activeGrants: grants.filter((g) => (g as any).status === 'approved').length,
      pendingGrants: grants.filter((g) => (g as any).status === 'pending').length,
      byType,
      byTypeName: Object.entries(byType).map(([id, count]) => ({
        id,
        name: typeNameById.get(id) ?? 'Unknown type',
        count,
      })),
    };
  }

  // === Learner Movement Report ===
  async getLearnerMovementReport(tenantId: string, schoolYearId: string) {
    const promotions = await this.templatesRepo.manager
      .createQueryBuilder('promotion_decisions', 'pd')
      .where('pd."tenantId" = :tenantId', { tenantId })
      .andWhere('pd."schoolYearId" = :syId', { syId: schoolYearId })
      .getMany();

    const byDecision: Record<string, number> = {};
    for (const p of promotions) {
      const decision = (p as any).decision || 'unknown';
      byDecision[decision] = (byDecision[decision] || 0) + 1;
    }

    // Enrich with student names + grade levels for the decisions table.
    const studentIds = Array.from(new Set(promotions.map((p) => (p as any).studentId).filter(Boolean)));
    const gradeLevelIds = Array.from(
      new Set(promotions.flatMap((p: any) => [p.gradeLevelId, p.targetGradeLevelId]).filter(Boolean)),
    );
    const [students, gradeLevels, eduLevels] = await Promise.all([
      studentIds.length ? this.templatesRepo.manager.getRepository(Student).find({ where: { id: In(studentIds) } }) : [],
      gradeLevelIds.length ? this.templatesRepo.manager.getRepository(GradeLevel).find({ where: { id: In(gradeLevelIds) } }) : [],
      gradeLevelIds.length ? this.templatesRepo.manager.getRepository(EducationLevel).find({ where: { id: In(gradeLevelIds) } }) : [],
    ]);
    const studentById = new Map<string, string>(students.map((s): [string, string] => [s.id, `${s.lastName}, ${s.firstName}`]));
    const gradeNameById = new Map<string, string>([
      ...gradeLevels.map((g): [string, string] => [g.id, g.name]),
      ...eduLevels.map((e): [string, string] => [e.id, e.name]),
    ]);

    return {
      total: promotions.length,
      byDecision,
      decisions: promotions.map((p: any) => ({
        id: p.id,
        studentName: studentById.get(p.studentId) ?? 'Unknown student',
        fromGrade: gradeNameById.get(p.gradeLevelId) ?? '—',
        toGrade: p.targetGradeLevelId ? gradeNameById.get(p.targetGradeLevelId) ?? '—' : null,
        decision: p.decision,
        remarks: p.remarks ?? null,
        decidedAt: p.decidedAt,
        isFinalized: p.isFinalized,
      })),
    };
  }

  // === Report Templates ===
  async getTemplates(tenantId: string) {
    return this.templatesRepo.find({ where: { tenantId, isActive: true }, order: { isSystem: 'DESC', name: 'ASC' } });
  }

  async createTemplate(data: Partial<ReportTemplate>) {
    const template = this.templatesRepo.create(data);
    return this.templatesRepo.save(template);
  }

  // === Scheduled Reports ===
  async getScheduledReports(tenantId: string) {
    return this.scheduledRepo.find({ where: { tenantId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createScheduledReport(data: Partial<ScheduledReport>) {
    const report = this.scheduledRepo.create(data);
    return this.scheduledRepo.save(report);
  }

  async toggleScheduledReport(id: string, tenantId: string, isActive: boolean) {
    const report = await this.scheduledRepo.findOne({ where: { id, tenantId } });
    if (!report) return null;
    report.isActive = isActive;
    return this.scheduledRepo.save(report);
  }
}
