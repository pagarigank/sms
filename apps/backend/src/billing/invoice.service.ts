import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { StudentDiscountGrant } from './student-discount-grant.entity';
import { Student } from '../sis/student.entity';
import { BillingService } from './billing.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private invoiceItemsRepo: Repository<InvoiceItem>,
    @InjectRepository(StudentDiscountGrant) private discountGrantsRepo: Repository<StudentDiscountGrant>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    private billingService: BillingService,
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

    const invoice = this.invoicesRepo.create({
      tenantId: data.tenantId,
      branchId: data.branchId,
      studentId: data.studentId,
      enrollmentId: data.enrollmentId,
      termId: data.termId ?? null,
      totalAmount: resolved.totalAmount,
      discountAmount,
      paidAmount: 0,
      balance,
      invoiceNumber: await this.generateInvoiceNumber(data.tenantId),
      metadata: { feeStructureId: resolved.structure.id, discountGrantIds: grants.map((g) => g.id) },
    });
    const savedInvoice = await this.invoicesRepo.save(invoice);

    // Create invoice items
    for (const item of resolved.items) {
      const invoiceItem = this.invoiceItemsRepo.create({
        tenantId: data.tenantId,
        invoiceId: savedInvoice.id,
        feeTypeId: item.feeTypeId,
        description: item.description,
        amount: item.amount,
        netAmount: item.amount,
      });
      await this.invoiceItemsRepo.save(invoiceItem);
    }

    return savedInvoice;
  }

  async applyDiscount(invoiceId: string, tenantId: string, discountAmount: number) {
    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    invoice.discountAmount = discountAmount;
    invoice.balance = Math.max(0, Number(invoice.totalAmount) - Number(discountAmount) - Number(invoice.paidAmount));
    return this.invoicesRepo.save(invoice);
  }

  async applyPayment(invoiceId: string, tenantId: string, amount: number) {
    const invoice = await this.invoicesRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

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

    return this.invoicesRepo.save(invoice);
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

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.invoicesRepo.count({ where: { tenantId } });
    return `INV-${(count + 1).toString().padStart(6, '0')}`;
  }
}
