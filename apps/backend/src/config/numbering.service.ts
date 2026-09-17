import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NumberingScheme } from './numbering-scheme.entity';

/**
 * FR-CFG-3: numbering-scheme engine — the allocation side of the Config
 * Engine's numbering manager. Configuring a scheme in the UI only stores the
 * format; numbers are actually minted here.
 *
 * `allocateNumber` is transaction-aware: pass a transactional EntityManager
 * (e.g. from dataSource.transaction) and the counter increment JOINS that
 * transaction — a rollback never burns a number, and concurrent allocations
 * serialize on the counter row lock. Called without a transaction it opens
 * its own.
 *
 * Format tokens: {PREFIX} (legacy, empty), {YYYY}, {YY}, {MM}, {SEQ} (6-digit)
 * and {SEQ:n} (n-digit). Schemes are auto-provisioned from sane defaults the
 * first time an entity type allocates, so config-driven numbering works
 * before an admin has touched the manager; the auto-created row then shows up
 * in the manager UI and is editable like any other scheme.
 */
const DEFAULT_SCHEMES: Record<string, { name: string; format: string }> = {
  invoice: { name: 'Invoice Number', format: 'INV-{YYYY}-{SEQ}' },
  student: { name: 'Student Number', format: '{YYYY}-{SEQ:4}' },
};

@Injectable()
export class NumberingService {
  private readonly logger = new Logger(NumberingService.name);

  constructor(
    @InjectRepository(NumberingScheme) private readonly numberingRepo: Repository<NumberingScheme>,
  ) {}

  /**
   * Mint the next number for an entity type. Safe to call inside an existing
   * transaction (pass `tx`) or standalone. The UPDATE ... RETURNING takes a
   * row lock on the counter, so two concurrent callers get distinct,
   * gap-free sequences and a rolled-back caller never consumes a number.
   */
  async allocateNumber(
    tenantId: string,
    entityType: string,
    opts?: { branchId?: string | null; tx?: EntityManager },
  ): Promise<string> {
    if (!tenantId) throw new Error('allocateNumber requires a tenantId');
    const run = async (manager: EntityManager): Promise<string> => {
      let schemes = await manager.find(NumberingScheme, {
        where: { tenantId, entityType, isActive: true },
      });
      if (schemes.length === 0) {
        const fallback = DEFAULT_SCHEMES[entityType] ?? {
          name: `${entityType} number`,
          format: '{YYYY}{SEQ}',
        };
        await manager.save(
          NumberingScheme,
          manager.create(NumberingScheme, {
            tenantId,
            entityType,
            name: fallback.name,
            format: fallback.format,
            isActive: true,
          }),
        );
        schemes = await manager.find(NumberingScheme, {
          where: { tenantId, entityType, isActive: true },
        });
      }
      // Branch-specific scheme wins over the tenant-level one.
      const scheme =
        (opts?.branchId ? schemes.find((s) => s.branchId === opts.branchId) : undefined) ??
        schemes.find((s) => !s.branchId) ??
        schemes[0];

      // Raw UPDATE ... RETURNING on the counter row: atomic, row-locked, and
      // rolls back with the surrounding transaction. (TypeORM 0.3.31 returns
      // the rows array directly from manager.query.)
      const rows: any[] = await manager.query(
        `UPDATE "numbering_schemes" SET "counterValue" = "counterValue" + 1
         WHERE "id" = $1
         RETURNING "counterValue", "format"`,
        [scheme.id],
      );
      const counter = Number(rows[0]?.counterValue ?? 1);
      return this.formatNumber(rows[0]?.format ?? scheme.format, counter);
    };
    return opts?.tx ? run(opts.tx) : this.numberingRepo.manager.transaction(run);
  }

  private formatNumber(format: string, counter: number): string {
    const now = new Date();
    const year = String(now.getFullYear());
    return format
      .replaceAll('{YYYY}', year)
      .replaceAll('{YY}', year.slice(-2))
      .replaceAll('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/\{SEQ:(\d+)\}/g, (_, pad: string) => String(counter).padStart(Number(pad), '0'))
      .replaceAll('{SEQ}', String(counter).padStart(6, '0'))
      .replaceAll('{PREFIX}', '');
  }
}
