import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { ScheduledReport } from './scheduled-report.entity';
import { ReportTemplate } from './report-template.entity';
import { Tenant } from '../tenants/tenant.entity';
import { CommunicationsService } from '../communications/communications.service';

/** Notification eventType bridging subscription → template via rules. */
export const SCHEDULED_REPORT_EVENT = 'scheduled_report';

const MS_PER_HOUR = 3_600_000;

/** Frequency → ms between runs (matched against lastRunAt). */
const INTERVALS_MS: Record<string, number> = {
  daily: 24 * MS_PER_HOUR,
  weekly: 7 * 24 * MS_PER_HOUR,
  monthly: 30 * 24 * MS_PER_HOUR,
};

/**
 * Executes scheduled report subscriptions and dispatches the result through
 * the notification system (rules → templates → notification_logs).
 *
 * Trigger model: an interval scanner (no cron-exactness needed — this is an
 * availability feature, not a billing deadline). Every 10 minutes it finds
 * active subscriptions on active tenants whose daily/weekly/monthly cadence
 * has elapsed since lastRunAt.
 */
@Injectable()
export class ScheduledReportDispatcher {
  private readonly logger = new Logger(ScheduledReportDispatcher.name);
  /** Re-entrancy latch: the scanner must not overlap itself. */
  private running = false;

  constructor(
    @InjectRepository(ScheduledReport) private scheduledRepo: Repository<ScheduledReport>,
    @InjectRepository(ReportTemplate) private templatesRepo: Repository<ReportTemplate>,
    @InjectRepository(Tenant) private tenantsRepo: Repository<Tenant>,
    private readonly communications: CommunicationsService,
  ) {}

  @Interval(10 * 60 * 1000)
  async scan() {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.findDueSubscriptions(new Date());
      for (const sub of due) {
        await this.runSubscription(sub).catch((e) => {
          this.logger.warn(
            `Scheduled report ${sub.id} (${sub.name}) failed: ${e instanceof Error ? e.message : e}`,
          );
        });
      }
    } finally {
      this.running = false;
    }
  }

  /** Active subscriptions across active tenants whose cadence has elapsed. */
  private async findDueSubscriptions(now: Date): Promise<ScheduledReport[]> {
    const tenants = await this.tenantsRepo.find({ where: { status: 'active' } });
    if (tenants.length === 0) return [];

    const candidates = await this.scheduledRepo.find({
      where: {
        isActive: true,
        tenantId: In(tenants.map((t) => t.id)),
        frequency: In(Object.keys(INTERVALS_MS)),
      },
    });

    return candidates.filter((sub) => {
      if (!sub.lastRunAt) return true; // never ran
      const elapsed = now.getTime() - new Date(sub.lastRunAt).getTime();
      return elapsed >= INTERVALS_MS[sub.frequency];
      // A failed run (lastRunStatus='failed') is retried on the next due scan
      // either way — same cadence, logged outcome.
    });
  }

  /**
   * Execute one subscription now: run its template's report, dispatch the
   * summary to the recipients, stamp lastRun. Also the engine behind the
   * "run now" route (the stamp makes a manual run count toward the cadence).
   */
  async runSubscription(sub: ScheduledReport): Promise<{ dispatched: number; summary: string }> {
    let result: Record<string, any>;
    try {
      result = await this.executeTemplate(sub);
    } catch (e) {
      await this.scheduledRepo.update(
        { id: sub.id },
        { lastRunAt: new Date(), lastRunStatus: 'failed' },
      );
      throw e;
    }

    const dispatched = await this.dispatchResult(sub, result);
    await this.scheduledRepo.update(
      { id: sub.id },
      { lastRunAt: new Date(), lastRunStatus: 'success' },
    );
    return { dispatched, summary: summarize(result) };
  }

  /** Run a template's report. Returns the snapshot payload. */
  private async executeTemplate(sub: ScheduledReport): Promise<Record<string, any>> {
    const template = await this.templatesRepo.findOne({
      where: { id: sub.reportTemplateId, tenantId: sub.tenantId },
    });
    if (!template) {
      throw new NotFoundException(`Report template ${sub.reportTemplateId} not found`);
    }

    const m = this.templatesRepo.manager;
    switch (template.reportType) {
      case 'ar_aging':
        return this.arAgingSnapshot(m, sub.tenantId);
      case 'enrollment_stats':
        return this.enrollmentSnapshot(m, sub.tenantId);
      case 'revenue':
        return this.revenueSnapshot(m, sub.tenantId);
      default:
        throw new Error(`Report template type "${template.reportType}" has no scheduled snapshot yet`);
    }
  }

  /** AR-aging aggregation — same math as ReportingService.getARAgingReport. */
  private async arAgingSnapshot(m: Repository<ScheduledReport>['manager'], tenantId: string) {
    const invoices = await m.query(
      `SELECT "balance", "dueDate" FROM invoices WHERE "tenantId" = $1 AND "balance" > 0`,
      [tenantId],
    );
    const now = Date.now();
    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    let totalOutstanding = 0;
    let invoiceCount = 0;
    for (const inv of invoices) {
      if (!inv.dueDate) continue;
      const daysOverdue = Math.floor((now - new Date(inv.dueDate).getTime()) / 86_400_000);
      const balance = Number(inv.balance);
      if (daysOverdue <= 0) aging.current += balance;
      else if (daysOverdue <= 30) aging.days30 += balance;
      else if (daysOverdue <= 60) aging.days60 += balance;
      else if (daysOverdue <= 90) aging.days90 += balance;
      else aging.over90 += balance;
      totalOutstanding += balance;
      invoiceCount++;
    }
    return { reportType: 'ar_aging', aging, totalOutstanding, invoiceCount };
  }

  /** Enrollment aggregation — same math as ReportingService.getEnrollmentReport. */
  private async enrollmentSnapshot(m: Repository<ScheduledReport>['manager'], tenantId: string) {
    const rows = await m.query(
      `SELECT status, count(*)::int AS count FROM enrollments WHERE "tenantId" = $1 GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byStatus[r.status ?? 'unknown'] = r.count;
      total += r.count;
    }
    return { reportType: 'enrollment_stats', total, byStatus };
  }

  /** Revenue aggregation — same math as ReportingService.getRevenueReport (all-time). */
  private async revenueSnapshot(m: Repository<ScheduledReport>['manager'], tenantId: string) {
    const rows = await m.query(
      `SELECT "method", count(*)::int AS count, COALESCE(SUM("amount"),0) AS total
       FROM payments WHERE "tenantId" = $1 AND "status" = 'completed' GROUP BY "method"`,
      [tenantId],
    );
    return {
      reportType: 'revenue',
      total: rows.reduce((s, r) => s + Number(r.total), 0),
      byMethod: rows.map((r) => ({ method: r.method, count: r.count, total: Number(r.total) })),
    };
  }

  /**
   * Dispatch the summary through the tenant's own `scheduled_report`
   * notification rules — the same rules→template→log path attendance
   * thresholds use. Each recipient on the subscription gets one dispatch;
   * email templates receive the recipient's address as the contact.
   */
  private async dispatchResult(sub: ScheduledReport, result: Record<string, any>): Promise<number> {
    const summary = summarize(result);
    const variables = {
      reportName: sub.name,
      reportType: String(result.reportType ?? ''),
      summary,
      date: new Date().toISOString().split('T')[0],
    };

    const branchId = await this.resolveBranchId(sub.tenantId);
    const recipients = (sub.recipients ?? []).filter(Boolean);
    let dispatched = 0;

    for (const email of recipients) {
      const logs = await this.communications.dispatch({
        tenantId: sub.tenantId,
        branchId,
        eventType: SCHEDULED_REPORT_EVENT,
        recipientUserId: sub.createdBy ?? null,
        recipientEmail: email,
        variables,
      });
      dispatched += logs.length;
    }
    return dispatched;
  }

  /** notification_logs.branchId is NOT NULL — fall back to the tenant's first branch. */
  private async resolveBranchId(tenantId: string): Promise<string> {
    const rows = await this.templatesRepo.manager.query(
      `SELECT id FROM branches WHERE "tenantId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
      [tenantId],
    );
    return rows[0]?.id ?? tenantId;
  }
}

/** Human one-liner summarizing a snapshot for the notification body. */
function summarize(result: Record<string, any>): string {
  if (result.reportType === 'ar_aging') {
    const a = result.aging;
    const overdue90 = Number(a.days90) + Number(a.over90);
    return [
      `Outstanding ₱${fmt(result.totalOutstanding)} across ${result.invoiceCount} invoice(s)`,
      overdue90 > 0 ? `90+ days: ₱${fmt(overdue90)}` : null,
    ]
      .filter(Boolean)
      .join(' — ');
  }
  if (result.reportType === 'enrollment_stats') {
    const parts = Object.entries(result.byStatus).map(([k, v]) => `${k}: ${v}`);
    return `${result.total} enrollment(s) — ${parts.join(', ')}`;
  }
  if (result.reportType === 'revenue') {
    return `Collected ₱${fmt(result.total)} (all completed payments)`;
  }
  return JSON.stringify(result).slice(0, 200);
}

function fmt(n: number): string {
  return Number(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
}
