import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

/**
 * Generic override-by-shadow-row resolver (architecture.md §4).
 *
 * Pattern: tenant-level records have `branch_id = NULL` (the default).
 * Branch-specific records have `branch_id = <uuid>` and override the tenant default.
 *
 * Resolution order:
 *   1. Branch-specific active record (branch_id = :branchId)
 *   2. Tenant-default active record (branch_id = NULL)
 *
 * If no record is found, throws NotFoundException.
 *
 * Works with: curricula, fee_structures, grading_systems, document_templates, etc.
 */
@Injectable()
export class OverrideResolverService {
  constructor() {}

  /**
   * Resolve the active record for a given context.
   * @param repo - TypeORM repository for the entity
   * @param tenantId - Current tenant
   * @param branchId - Current branch (optional)
   * @param extraFilters - Additional where conditions (e.g. educationLevelId, schoolYearId)
   */
  async resolve<T extends { id: string; tenantId: string; branchId: string | null; isActive: boolean }>(
    repo: Repository<T>,
    tenantId: string,
    branchId: string | null | undefined,
    extraFilters: Record<string, any> = {},
  ): Promise<T> {
    // Try branch-specific first
    if (branchId) {
      const branchRecord = await repo.findOne({
        where: {
          tenantId,
          branchId,
          isActive: true,
          ...extraFilters,
        } as any,
      });
      if (branchRecord) return branchRecord;
    }

    // Fall back to tenant default (branchId = NULL)
    const qb: SelectQueryBuilder<T> = repo.createQueryBuilder('entity');
    qb.where('entity.tenantId = :tenantId', { tenantId });
    qb.andWhere('entity.branchId IS NULL');
    qb.andWhere('entity.isActive = true');

    for (const [key, value] of Object.entries(extraFilters)) {
      qb.andWhere(`entity.${key} = :${key}`, { [key]: value });
    }

    const tenantDefault = await qb.getOne();
    if (tenantDefault) return tenantDefault;

    throw new NotFoundException(
      `No active record found for tenant ${tenantId}` +
      (branchId ? ` (branch ${branchId})` : ' (tenant default)') +
      (Object.keys(extraFilters).length > 0 ? ` with filters: ${JSON.stringify(extraFilters)}` : ''),
    );
  }

  /**
   * Resolve with fallback to null instead of throwing.
   */
  async resolveOrNull<T extends { id: string; tenantId: string; branchId: string | null; isActive: boolean }>(
    repo: Repository<T>,
    tenantId: string,
    branchId: string | null | undefined,
    extraFilters: Record<string, any> = {},
  ): Promise<T | null> {
    try {
      return await this.resolve(repo, tenantId, branchId, extraFilters);
    } catch {
      return null;
    }
  }
}
