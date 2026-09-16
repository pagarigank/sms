import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { CashierSession } from './cashier-session.entity';
import { AtpSeries } from './atp-series.entity';
import { SeriesCounter } from './series-counter.entity';
import { OfficialReceipt } from './official-receipt.entity';
import { Payment } from './payment.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Refund } from './refund.entity';
import { AdHocSale } from './ad-hoc-sale.entity';
import { AdHocSaleItem } from './ad-hoc-sale-item.entity';
import { CashierStation } from './cashier-station.entity';
import { PaymentMethod } from './payment-method.entity';
import { DenominationSet } from './denomination-set.entity';
import { Invoice } from '../billing/invoice.entity';
import { InvoiceService } from '../billing/invoice.service';
import { Student } from '../sis/student.entity';

@Injectable()
export class CashieringService {
  constructor(
    @InjectRepository(CashierSession) private sessionsRepo: Repository<CashierSession>,
    @InjectRepository(AtpSeries) private atpSeriesRepo: Repository<AtpSeries>,
    @InjectRepository(SeriesCounter) private countersRepo: Repository<SeriesCounter>,
    @InjectRepository(OfficialReceipt) private receiptsRepo: Repository<OfficialReceipt>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectRepository(PaymentAllocation) private allocationsRepo: Repository<PaymentAllocation>,
    @InjectRepository(Refund) private refundsRepo: Repository<Refund>,
    @InjectRepository(AdHocSale) private adHocSalesRepo: Repository<AdHocSale>,
    @InjectRepository(AdHocSaleItem) private adHocItemsRepo: Repository<AdHocSaleItem>,
    @InjectRepository(CashierStation) private stationsRepo: Repository<CashierStation>,
    @InjectRepository(PaymentMethod) private methodsRepo: Repository<PaymentMethod>,
    @InjectRepository(DenominationSet) private denominationSetsRepo: Repository<DenominationSet>,
    private dataSource: DataSource,
    private invoiceService: InvoiceService,
  ) {}

  // === Cashier Sessions ===
  async openSession(data: {
    tenantId: string; branchId: string; stationId?: string;
    cashierUserId: string; openingFloat: number; denominationBreakdown?: Record<string, any>;
  }) {
    // Check no open session already exists for this cashier
    const existing = await this.sessionsRepo.findOne({
      where: { tenantId: data.tenantId, cashierUserId: data.cashierUserId, status: 'open' },
    });
    if (existing) throw new BadRequestException('Cashier already has an open session');

    const session = this.sessionsRepo.create({
      tenantId: data.tenantId,
      branchId: data.branchId,
      stationId: data.stationId,
      cashierUserId: data.cashierUserId,
      openingFloat: data.openingFloat,
      denominationBreakdown: data.denominationBreakdown || {},
      status: 'open',
    });
    return this.sessionsRepo.save(session);
  }

  async closeSession(id: string, tenantId: string, data: {
    closingActual: number; denominationBreakdown?: Record<string, any>;
    varianceApprovedBy?: string;
  }) {
    const session = await this.sessionsRepo.findOne({ where: { id, tenantId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'open') throw new BadRequestException('Session is not open');

    // Calculate expected from CASH payments + opening float. Non-cash methods
    // (GCash, card, bank) never enter the physical drawer.
    const payments = await this.paymentsRepo.find({
      where: { cashierSessionId: id, tenantId, status: 'completed' },
    });
    const cashCodes = await this.getCashMethodCodes(tenantId);
    const cashPayments = payments.filter((p) => cashCodes.has(p.method));
    const totalPayments = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const expected = Number(session.openingFloat) + totalPayments;
    const variance = data.closingActual - expected;

    session.closingActual = data.closingActual;
    session.closedAt = new Date();
    session.status = 'closed';
    session.varianceAmount = variance;
    if (data.varianceApprovedBy) session.varianceApprovedBy = data.varianceApprovedBy;
    if (data.denominationBreakdown) {
      session.denominationBreakdown = data.denominationBreakdown;
    }

    return this.sessionsRepo.save(session);
  }

  async getOpenSession(tenantId: string, cashierUserId: string) {
    return this.sessionsRepo.findOne({
      where: { tenantId, cashierUserId, status: 'open' },
    });
  }

  async getSessionSummary(id: string, tenantId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id, tenantId } });
    if (!session) throw new NotFoundException('Session not found');

    const payments = await this.paymentsRepo.find({
      where: { cashierSessionId: id, tenantId, status: 'completed' },
    });

    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount);
    }

    return {
      session,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      byMethod,
    };
  }

  /** Codes of payment methods that count toward the physical cash drawer. */
  private async getCashMethodCodes(tenantId: string): Promise<Set<string>> {
    const methods = await this.methodsRepo.find({ where: { tenantId, isActive: true } });
    const cash = methods.filter((m) => m.isCash);
    // Fallback when config hasn't been seeded yet: only literal "cash" counts
    if (cash.length === 0 && !methods.some((m) => m.code === 'cash')) {
      return new Set(['cash']);
    }
    return new Set(cash.map((m) => m.code));
  }

  /**
   * manager.query's result shape is TypeORM/driver-version dependent (0.3.31
   * + pg returns the rows array directly; other versions return the pg
   * { rows } result). Normalize so row reads never crash on shape.
   */
  private queryRows<T>(result: unknown): T[] {
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === 'object' && Array.isArray((result as any).rows)) {
      return (result as any).rows as T[];
    }
    return [];
  }

  // === OR Numbering (gapless, transactional) ===
  async allocateOrNumber(tenantId: string, branchId: string): Promise<{ orNumber: string; orDisplay: string; seriesId: string }> {
    return this.dataSource.transaction(async (manager) =>
      this.allocateOrNumberTx(manager, tenantId, branchId),
    );
  }

  /**
   * OR allocation that JOINS the caller's transaction. The money path
   * (processPayment) must issue the receipt inside the payment transaction —
   * a standalone transaction here would burn a BIR gapless number even when
   * the outer payment rolls back.
   */
  private async allocateOrNumberTx(
    manager: EntityManager,
    tenantId: string,
    branchId: string,
  ): Promise<{ orNumber: string; orDisplay: string; seriesId: string }> {
      // Find active ATP series for branch
      const series = await manager.findOne(AtpSeries, {
        where: { tenantId, branchId, isActive: true },
        order: { createdAt: 'DESC' },
      });
      if (!series) throw new BadRequestException('No active ATP series for this branch');

      // Get-or-create the counter row ATOMICALLY, then LOCK it before read.
      // BIR compliance requires zero duplicate OR numbers under concurrency:
      // the unique scope index (migration 012) makes concurrent first
      // allocations safe via ON CONFLICT DO NOTHING, and FOR UPDATE
      // serializes subsequent increments per series.
      await manager.query(
        `INSERT INTO series_counters ("id", "tenantId", "branchId", "atpSeriesId", "counterValue")
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT ("tenantId", "branchId", "atpSeriesId") DO NOTHING`,
        [tenantId, branchId, series.id, Number(series.rangeStart) - 1],
      );
      const locked = await manager.query(
        `SELECT "counterValue" FROM series_counters
         WHERE "tenantId" = $1 AND "branchId" = $2 AND "atpSeriesId" = $3
         FOR UPDATE`,
        [tenantId, branchId, series.id],
      );
      const nextValue = Number(this.queryRows<{ counterValue: number }>(locked)[0]?.counterValue ?? 0) + 1;
      if (nextValue > Number(series.rangeEnd)) {
        throw new BadRequestException('ATP series range exhausted');
      }

      await manager.query(
        `UPDATE series_counters SET "counterValue" = $1
         WHERE "tenantId" = $2 AND "branchId" = $3 AND "atpSeriesId" = $4`,
        [nextValue, tenantId, branchId, series.id],
      );

      const orNumber = nextValue.toString().padStart(10, '0');
      // Display format from the series [G-1/G-10], e.g. "OR-{year}-{number}"
      const orDisplay = (series.formatTemplate || 'OR-{year}-{number}')
        .replace('{year}', String(new Date().getFullYear()))
        .replace('{number}', orNumber);

      return { orNumber, orDisplay, seriesId: series.id };
  }

  async reserveOrBlock(sessionId: string, tenantId: string, branchId: string, blockSize: number) {
    return this.dataSource.transaction(async (manager) => {
      const series = await manager.findOne(AtpSeries, {
        where: { tenantId, branchId, isActive: true },
        order: { createdAt: 'DESC' },
      });
      if (!series) throw new BadRequestException('No active ATP series');

      // Same atomic get-or-create + row-lock as allocateOrNumber (migration 012).
      await manager.query(
        `INSERT INTO series_counters ("id", "tenantId", "branchId", "atpSeriesId", "counterValue")
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT ("tenantId", "branchId", "atpSeriesId") DO NOTHING`,
        [tenantId, branchId, series.id, Number(series.rangeStart) - 1],
      );
      const locked = await manager.query(
        `SELECT "counterValue" FROM series_counters
         WHERE "tenantId" = $1 AND "branchId" = $2 AND "atpSeriesId" = $3
         FOR UPDATE`,
        [tenantId, branchId, series.id],
      );
      const current = Number(this.queryRows<{ counterValue: number }>(locked)[0]?.counterValue ?? 0);

      const blockStart = current + 1;
      const blockEnd = blockStart + blockSize - 1;
      if (blockEnd > Number(series.rangeEnd)) {
        throw new BadRequestException('Not enough OR numbers in series for block reservation');
      }

      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
      await manager.query(
        `UPDATE series_counters
         SET "counterValue" = $1, "reservedBlockStart" = $2, "reservedBlockEnd" = $3,
             "sessionId" = $4, "reservedAt" = NOW(), "expiresAt" = $5
         WHERE "tenantId" = $6 AND "branchId" = $7 AND "atpSeriesId" = $8`,
        [blockEnd, blockStart, blockEnd, sessionId, expiresAt, tenantId, branchId, series.id],
      );

      return { blockStart, blockEnd, sessionId, expiresAt };
    });
  }

  // === Payments ===
  /**
   * Records a payment AND drives every downstream effect in one transaction:
   *   1. payment row (idempotent by key)
   *   2. invoice ledger update via InvoiceService (paidAmount/balance/status)
   *   3. oldest-balance-first allocation rows
   *   4. gapless Official Receipt issuance from the branch's active ATP series
   * Previously only step 1 ran — money was collected but invoices, allocations
   * and receipts never reflected it.
   */
  async processPayment(data: {
    tenantId: string; branchId: string; invoiceId?: string;
    adHocSaleId?: string; cashierSessionId?: string; amount: number;
    method: string; gatewayReference?: string; idempotencyKey?: string;
    denominationBreakdown?: Record<string, any>;
  }) {
    if (!data.invoiceId && !data.adHocSaleId) {
      throw new BadRequestException('Either invoiceId or adHocSaleId is required');
    }
    if (!(Number(data.amount) > 0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Check idempotency — scoped to the tenant: the payments.idempotencyKey
    // unique index is global, so an unscoped lookup could return another
    // tenant's payment on a colliding key.
    if (data.idempotencyKey) {
      const existing = await this.paymentsRepo.findOne({
        where: { tenantId: data.tenantId, idempotencyKey: data.idempotencyKey },
      });
      if (existing) return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        tenantId: data.tenantId,
        branchId: data.branchId,
        invoiceId: data.invoiceId,
        adHocSaleId: data.adHocSaleId,
        cashierSessionId: data.cashierSessionId,
        amount: data.amount,
        method: data.method,
        gatewayReference: data.gatewayReference,
        idempotencyKey: data.idempotencyKey,
        status: 'completed',
        denominationBreakdown: data.denominationBreakdown || {},
      });
      const savedPayment = await manager.save(payment);

      // 2) Invoice ledger + 3) allocation (invoice payments only)
      if (data.invoiceId) {
        // Ledger update must join THIS transaction (applyPaymentTx), not open
        // its own — otherwise an outer rollback leaves the invoice marked
        // paid with no payment row behind it.
        await this.invoiceService.applyPaymentTx(manager, data.invoiceId, data.tenantId, Number(data.amount));
        await manager.save(PaymentAllocation, manager.create(PaymentAllocation, {
          tenantId: data.tenantId,
          paymentId: savedPayment.id,
          invoiceId: data.invoiceId,
          amountApplied: data.amount,
        }));
      }

      // 4) Official Receipt — BIR compliance requires one per collection, with
      //    payor identity and amount (FR-CSH-4). Joins this transaction so the
      //    gapless number is not burned if any leg above rolls back.
      const { orNumber, orDisplay, seriesId } = await this.allocateOrNumberTx(
        manager,
        data.tenantId,
        data.branchId,
      );
      let payorName = 'Walk-in';
      if (data.invoiceId) {
        const invoice = await manager.findOne(Invoice, {
          where: { id: data.invoiceId, tenantId: data.tenantId },
        });
        if (invoice) {
          const student = await manager.findOne(Student, { where: { id: invoice.studentId } });
          if (student) payorName = `${student.lastName}, ${student.firstName}`;
        }
      } else if (data.adHocSaleId) {
        const sale = await manager.findOne(AdHocSale, {
          where: { id: data.adHocSaleId, tenantId: data.tenantId },
        });
        if (sale?.buyerName) payorName = sale.buyerName;
      }
      const receipt = manager.create(OfficialReceipt, {
        tenantId: data.tenantId,
        branchId: data.branchId,
        paymentId: savedPayment.id,
        orNumber,
        orNumberDisplay: orDisplay,
        atpSeriesId: seriesId,
        payorName,
        amount: data.amount,
        isTaxExempt: false,
      });
      const savedReceipt = await manager.save(receipt);

      return { ...savedPayment, receipt: savedReceipt };
    });
  }

  async allocatePayment(paymentId: string, tenantId: string, allocations: { invoiceId: string; amountApplied: number }[]) {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amountApplied), 0);
    if (totalAllocated > Number(payment.amount)) {
      throw new BadRequestException('Allocations exceed payment amount');
    }

    const results = [];
    // One transaction: allocation rows + ledger updates commit or roll back
    // together (previously each leg auto-committed — a failed ledger update
    // left an allocation row with no balance change, and vice versa).
    return this.dataSource.transaction(async (manager) => {
      const results = [];
      for (const alloc of allocations) {
        const allocation = manager.create(PaymentAllocation, {
          tenantId,
          paymentId,
          invoiceId: alloc.invoiceId,
          amountApplied: alloc.amountApplied,
        });
        results.push(await manager.save(allocation));
        // Keep the invoice ledger in sync with the allocation (row-locked).
        await this.invoiceService.applyPaymentTx(manager, alloc.invoiceId, tenantId, Number(alloc.amountApplied));
      }
      return results;
    });
  }

  // === Refunds ===
  async voidReceipt(id: string, tenantId: string, reason: string, voidedBy: string) {
    const receipt = await this.receiptsRepo.findOne({ where: { id, tenantId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.isVoided) throw new BadRequestException('Receipt already voided');

    receipt.isVoided = true;
    receipt.voidReason = reason;
    return this.receiptsRepo.save(receipt);
  }

  async createRefund(data: {
    tenantId: string; branchId: string; originalOrId: string;
    invoiceId: string; amount: number; reason: string; approvedBy?: string;
  }) {
    const refund = this.refundsRepo.create({
      ...data,
      status: data.approvedBy ? 'approved' : 'pending',
    });
    return this.refundsRepo.save(refund);
  }

  // === Ad-Hoc Sales ===
  async createAdHocSale(data: {
    tenantId: string; branchId: string; sessionId: string;
    buyerName?: string; items: { description: string; quantity: number; unitPrice: number; discountAmount?: number }[];
  }) {
    const totalAmount = data.items.reduce((sum, item) => {
      const lineTotal = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
      return sum + lineTotal;
    }, 0);

    const sale = this.adHocSalesRepo.create({
      tenantId: data.tenantId,
      branchId: data.branchId,
      sessionId: data.sessionId,
      buyerName: data.buyerName,
      totalAmount,
    });
    const savedSale = await this.adHocSalesRepo.save(sale);

    for (const item of data.items) {
      const lineTotal = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
      const saleItem = this.adHocItemsRepo.create({
        tenantId: data.tenantId,
        adHocSaleId: savedSale.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        lineTotal,
      });
      await this.adHocItemsRepo.save(saleItem);
    }

    return savedSale;
  }

  // === Stations / Methods ===
  async getStations(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) where.branchId = branchId;
    return this.stationsRepo.find({ where });
  }

  async getPaymentMethods(tenantId: string) {
    return this.methodsRepo.find({ where: { tenantId, isActive: true }, order: { code: 'ASC' } });
  }

  async getDenominationSets(tenantId: string) {
    return this.denominationSetsRepo.find({ where: { tenantId, isActive: true } });
  }

  // === Reports ===
  async getDailyCollectionReport(tenantId: string, branchId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await this.paymentsRepo
      .createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."branchId" = :branchId', { branchId })
      .andWhere('p."paidAt" BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('p.status = :status', { status: 'completed' })
      .getMany();

    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      if (!byMethod[p.method]) byMethod[p.method] = { count: 0, total: 0 };
      byMethod[p.method].count++;
      byMethod[p.method].total += Number(p.amount);
    }

    return {
      date,
      branchId,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      byMethod,
    };
  }
}
