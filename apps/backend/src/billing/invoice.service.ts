import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { StudentDiscountGrant } from './student-discount-grant.entity';
import { Student } from '../sis/student.entity';
import { BillingService } from './billing.service';
import { NumberingService } from '../config/numbering.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private invoiceItemsRepo: Repository<InvoiceItem>,
    @InjectRepository(StudentDiscountGrant) private discountGrantsRepo: Repository<StudentDiscountGrant>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    private billingService: BillingService,
    private dataSource: DataSource,
    private numberingService: NumberingService,
  ) {}

  // === Invoices ===
  async getInvoices(tenantId: string, params?: { studentId?: string; enrollmentId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.studentId) where.studentId = params.studentId;
    if (params?.enrollmentId) where.enrollmentId = params.enrollmentId;
    if (params?.status) where.status = params.status;
    const invoices = await this.invoicesRepo.find({ where, order: { createdAt: 'DESC' } });

    // Resolve student names so the UI doesn't show raw UUIDs
    const studentIds = [...new Set(invoices.map((i) => i.studentId))];
    const students = studentIds.length
      ? await this.studentsRepo.find({ where: { id: In(studentIds) } })
      : [];
    const nameById = new Map(students.map((s) => [s.id, `${s.lastName}, ${s.firstName}`]));

    return invoices.map((inv) => ({
      ...inv,
      studentName: nameById.get(inv.studentId) ?? `Student ${inv.studentId.slice(0, 8)}`,
    }));
  }

  async getInvoiceById(id: string, tenantId: string) {
    const invoice = await this.invoicesRepo.findOne({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const items = await this.invoiceItemsRepo.find({ where: { invoiceId: id, tenantId } });
    return { ...invoice, items };
  }

  async generateInvoice(data: {
    tenantId: string;
    branchId: string;
    studentId: string;
    enrollmentId: string;
    termId?: string;
  }) {
    // Check if invoice already exists for this enrollment (termId may be null;
    // match on the enrollment so one enrollment can't be double-invoiced)
    const existing = await this.invoicesRepo.findOne({
      where: { tenantId: data.tenantId, enrollmentId: data.enrollmentId },
    });
    if (existing) throw new BadRequestException('Invoice already exists for this enrollment');

    // Load the enrollment to resolve the fee-structure dimensions. The education
    // level lives on the enrollment's curriculum, not the enrollment itself.
    const enrollment = await this.billingService.getEnrollment(data.tenantId, data.enrollmentId);
    if (!enrollment) throw new BadRequestException('Enrollment not found');
    const educationLevelId = await this.billingService.getEducationLevelForCurriculum(enrollment.curriculumId);

    const resolved = await this.billingService.resolveFeeStructure(data.tenantId, {
      branchId: data.branchId,
      schoolYearId: enrollment.schoolYearId,
      educationLevelId,
      gradeLevelId: enrollment.gradeLevelId ?? undefined,
      strandId: enrollment.strandId ?? undefined,
      programId: enrollment.programId ?? undefined,
      termId: data.termId,
    });

    if (!resolved || resolved.items.length === 0) {
      throw new BadRequestException(
        'No fee structure found for this enrollment. Configure a fee structure for the school year first.',
      );
    }

    // Approved discount grants for this student reduce the invoice
    const grants = await this.discountGrantsRepo.find({
      where: { tenantId: data.tenantId, studentId: data.studentId, status: 'approved' },
    });
    let discountAmount = 0;
    const percentageDiscounts: number[] = [];
    const fixedDiscounts: number[] = [];
    for (const g of grants) {
      if (g.percentage && Number(g.percentage) > 0) percentageDiscounts.push(Number(g.percentage));
      if (g.fixedAmount && Number(g.fixedAmount) > 0) fixedDiscounts.push(Number(g.fixedAmount));
    }
    if (percentageDiscounts.length || fixedDiscounts.length) {
      const gross = resolved.totalAmount;
      const afterPercentage = percentageDiscounts.reduce((v, p) => v * (1 - p / 100), gross);
      discountAmount = Math.round((gross - afterPercentage + fixedDiscounts.reduce((s, f) => s + f, 0)) * 100) / 100;
      discountAmount = Math.min(discountAmount, gross);
    }

    const balance = Math.max(0, resolved.totalAmount - discountAmount);

    // Invoice + items are written in ONE transaction: a mid-way failure must
    // not leave an invoice with no (or partial) line items in AR.
    return this.dataSource.transaction(async (manager) => {
      const invoiceNumber = await this.generateInvoiceNumber(data.tenantId, manager, data.branchId);
      const savedInvoice = await manager.save(
        manager.create(Invoice, {
          tenantId: data.tenantId,
          branchId: data.branchId,
          studentId: data.studentId,
          enrollmentId: data.enrollmentId,
          termId: data.termId ?? null,
          totalAmount: resolved.totalAmount,
          discountAmount,
          paidAmount: 0,
          balance,
          invoiceNumber,
          metadata: { feeStructureId: resolved.structure.id, discountGrantIds: grants.map((g) => g.id) },
        }),
      );

      for (const item of resolved.items) {
        await manager.save(
          manager.create(InvoiceItem, {
            tenantId: data.tenantId,
            invoiceId: savedInvoice.id,
            feeTypeId: item.feeTypeId,
            description: item.description,
            amount: item.amount,
            netAmount: item.amount,
          }),
        );
      }

      return savedInvoice;
    });
  }

  async applyDiscount(invoiceId: string, tenantId: string, discountAmount: number) {
    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    invoice.discountAmount = discountAmount;
    invoice.balance = Math.max(0, Number(invoice.totalAmount) - Number(discountAmount) - Number(invoice.paidAmount));
    return this.invoicesRepo.save(invoice);
  }

  async applyPayment(invoiceId: string, tenantId: string, amount: number) {
    // Run in a transaction with a row lock so concurrent payments cannot
    // read-modify-write the same invoice (lost-update on the ledger).
    return this.dataSource.transaction(async (manager) =>
      this.applyPaymentTx(manager, invoiceId, tenantId, amount),
    );
  }

  /**
   * Ledger update that JOINS the caller's transaction. Called from the
   * cashiering money path (payment → ledger → allocation → OR) so every
   * leg commits or rolls back together. Locks the invoice row (FOR UPDATE)
   * to serialize concurrent applications.
   */
  async applyPaymentTx(
    manager: EntityManager,
    invoiceId: string,
    tenantId: string,
    amount: number,
  ) {
    // Lock the row before reading: two concurrent payments must not both
    // apply against the same pre-payment balance. RLS needs the tenant GUC,
    // which the pool hook (TenantAwareDataSource) sets before any query on
    // the connection — including raw ones — so no manual set_config here.
    const locked = await manager.query(
      `SELECT id FROM invoices WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
      [invoiceId, tenantId],
    );
    // manager.query's result shape is TypeORM-version dependent: 0.3.31 + pg
    // returns the rows array directly, older versions the pg { rows } result.
    const lockedRows: Array<{ id: string }> = Array.isArray(locked) ? locked : (locked.rows ?? []);
    if (!lockedRows.length) throw new NotFoundException('Invoice not found');

    const invoice = await manager.findOne(Invoice, {
      where: { id: invoiceId, tenantId },
    });

    // Numeric columns come back as strings — coerce before arithmetic
    // (plain `+=` string-concatenates and corrupts the ledger).
    invoice.paidAmount = Number(invoice.paidAmount) + amount;
    invoice.balance = Math.max(
      0,
      Number(invoice.totalAmount) - Number(invoice.discountAmount) - Number(invoice.paidAmount),
    );

    if (invoice.balance <= 0) {
      invoice.status = 'paid';
    } else if (Number(invoice.paidAmount) > 0) {
      invoice.status = 'partial';
    }

    return manager.save(invoice);
  }

  /**
   * Quote (without applying) the tenant's active penalty rule against an
   * overdue invoice. Same computation as `applyPenalty`, read-only.
   */
  async quotePenalty(invoiceId: string, tenantId: string) {
    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const quote = await this.billingService.computePenalty(tenantId, invoiceId);
    return {
      invoiceId,
      dueDate: invoice.dueDate,
      balance: Number(invoice.balance),
      penaltyAmount: Number(quote.penaltyAmount ?? 0),
      daysOverdue: quote.daysOverdue ?? null,
      rule: quote.rule,
      penaltyDue: Number(quote.penaltyAmount ?? 0) > 0,
    };
  }

  /**
   * Apply the tenant's active penalty rule to an overdue invoice. The quote
   * comes from BillingService.computePenalty (grace period, fixed vs daily
   * percentage, cap); the ledger update happens in one transaction so the
   * penalty and the recomputed balance can't diverge.
   */
  async applyPenalty(invoiceId: string, tenantId: string) {
    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const quote = await this.billingService.computePenalty(tenantId, invoiceId);
    if (!quote.rule) {
      throw new BadRequestException('No active penalty rule is configured for this tenant');
    }
    if (Number(quote.penaltyAmount) <= 0) {
      throw new BadRequestException(
        'No penalty is currently due for this invoice (not overdue, past balance is zero, or within the grace period)',
      );
    }

    const penalty = Number(quote.penaltyAmount);
    return this.dataSource.transaction(async (manager) => {
      invoice.penaltyAmount = Number(invoice.penaltyAmount) + penalty;
      invoice.balance = Math.max(
        0,
        Number(invoice.totalAmount) +
          Number(invoice.penaltyAmount) -
          Number(invoice.discountAmount) -
          Number(invoice.paidAmount),
      );
      if (invoice.status === 'paid' && invoice.balance > 0) invoice.status = 'partial';
      invoice.metadata = {
        ...(invoice.metadata ?? {}),
        lastPenaltyAppliedAt: new Date().toISOString(),
        lastPenaltyRuleId: quote.rule!.id,
        lastPenaltyDaysOverdue: quote.daysOverdue ?? null,
      };
      return manager.save(invoice);
    });
  }

  async getStatementOfAccount(studentId: string, tenantId: string) {
    const invoices = await this.invoicesRepo.find({
      where: { studentId, tenantId },
      order: { createdAt: 'DESC' },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const totalDiscount = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount), 0);

    return {
      studentId,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        discountAmount: inv.discountAmount,
        paidAmount: inv.paidAmount,
        balance: inv.balance,
        status: inv.status,
        dueDate: inv.dueDate,
        createdAt: inv.createdAt,
      })),
      summary: {
        totalBilled,
        totalPaid,
        totalBalance,
        totalDiscount,
      },
    };
  }

  async getARAging(tenantId: string, branchId?: string) {
    const invoices = await this.invoicesRepo.find({
      where: { tenantId, status: 'open' },
      order: { dueDate: 'ASC' },
    });

    const now = new Date();
    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
    };

    let counted = 0;
    for (const invoice of invoices) {
      if (branchId && invoice.branchId !== branchId) continue;
      counted++;
      const balance = Number(invoice.balance);
      if (balance <= 0) continue;
      if (!invoice.dueDate) {
        aging.current += balance; // no due date yet → treat as current
        continue;
      }
      const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) aging.current += balance;
      else if (daysOverdue <= 30) aging.days30 += balance;
      else if (daysOverdue <= 60) aging.days60 += balance;
      else if (daysOverdue <= 90) aging.days90 += balance;
      else aging.over90 += balance;
    }

    return {
      aging,
      totalOutstanding: Object.values(aging).reduce((sum, v) => sum + v, 0),
      invoiceCount: counted,
    };
  }

  /**
   * FR-CFG-3: invoice numbers come from the tenant's numbering scheme
   * (numbering_schemes, entityType='invoice'), auto-provisioned as
   * INV-{YYYY}-{SEQ}. The counter increments inside the invoice transaction —
   * a rollback never burns a number. Kept UNIQUE via migration 025 (the old
   * count-based scheme collided under concurrency).
   */
  private async generateInvoiceNumber(
    tenantId: string,
    tx: EntityManager,
    branchId?: string,
  ): Promise<string> {
    return this.numberingService.allocateNumber(tenantId, 'invoice', { branchId, tx });
  }
}
