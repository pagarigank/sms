import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

/** The authenticated-request pieces logMutation reads (JWT payload + tenant header). */
interface ActorRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub?: string; id?: string };
}
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { LookupList } from './lookup-list.entity';
import { LookupItem } from './lookup-item.entity';
import { CustomFieldDefinition } from './custom-field-definition.entity';
import { AuditEvent } from './audit-event.entity';
import { NumberingScheme } from './numbering-scheme.entity';
import { FeatureFlag } from './feature-flag.entity';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowInstance } from './workflow-instance.entity';

@Injectable()
export class ConfigEngineService {
  constructor(
    @InjectRepository(LookupList) private lookupListsRepo: Repository<LookupList>,
    @InjectRepository(LookupItem) private lookupItemsRepo: Repository<LookupItem>,
    @InjectRepository(CustomFieldDefinition) private customFieldsRepo: Repository<CustomFieldDefinition>,
    @InjectRepository(AuditEvent) private auditEventsRepo: Repository<AuditEvent>,
    @InjectRepository(NumberingScheme) private numberingRepo: Repository<NumberingScheme>,
    @InjectRepository(FeatureFlag) private featureFlagsRepo: Repository<FeatureFlag>,
    @InjectRepository(WorkflowDefinition) private workflowsRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance) private workflowInstancesRepo: Repository<WorkflowInstance>,
  ) {}

  // --- Guarded mutation helpers ---
  private async updateGuarded<T>(repo: Repository<T>, id: string, data: any, label: string) {
    const res = await (repo as any).update(id, data);
    if (res.affected === 0) throw new NotFoundException(`${label} ${id} not found`);
    return (repo as any).findOneBy({ id });
  }

  private async deleteGuarded<T>(repo: Repository<T>, id: string, label: string) {
    try {
      const res = await (repo as any).delete(id);
      if (res.affected === 0) throw new NotFoundException(`${label} ${id} not found`);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (e instanceof QueryFailedError) {
        throw new ConflictException(`${label} ${id} is referenced by other records and cannot be deleted`);
      }
      throw e;
    }
  }

  // --- Lookup Lists ---
  async findLookupLists(tenantId: string): Promise<LookupList[]> {
    return this.lookupListsRepo.find({ where: { tenantId } });
  }

  async createLookupList(data: Partial<LookupList>, actor?: ActorRequest): Promise<LookupList> {
    const list = await this.lookupListsRepo.save(this.lookupListsRepo.create(data));
    await this.logMutation(actor, 'LookupList', list.id, 'create', null, list);
    return list;
  }

  async findOneLookupList(id: string): Promise<LookupList> {
    const list = await this.lookupListsRepo.findOneBy({ id });
    if (!list) throw new NotFoundException(`Lookup list ${id} not found`);
    return list;
  }

  async updateLookupList(id: string, data: Partial<LookupList>, actor?: ActorRequest) {
    const before = await this.lookupListsRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.lookupListsRepo, id, data, 'Lookup list');
    await this.logMutation(actor, 'LookupList', id, 'update', before, updated);
    return updated;
  }

  async removeLookupList(id: string, actor?: ActorRequest) {
    const items = await this.lookupItemsRepo.count({ where: { lookupListId: id } });
    if (items > 0) throw new ConflictException(`Lookup list ${id} still has ${items} items — delete them first`);
    const before = await this.lookupListsRepo.findOneBy({ id });
    await this.deleteGuarded(this.lookupListsRepo, id, 'Lookup list');
    await this.logMutation(actor, 'LookupList', id, 'delete', before, null);
  }

  async findLookupItemsFlat(tenantId: string, lookupListId?: string): Promise<LookupItem[]> {
    const where: any = { tenantId };
    if (lookupListId) where.lookupListId = lookupListId;
    return this.lookupItemsRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findLookupItems(listId: string): Promise<LookupItem[]> {
    return this.lookupItemsRepo.find({ where: { lookupListId: listId }, order: { sortOrder: 'ASC' } });
  }

  async createLookupItem(data: Partial<LookupItem>, actor?: ActorRequest): Promise<LookupItem> {
    const item = await this.lookupItemsRepo.save(this.lookupItemsRepo.create(data));
    await this.logMutation(actor, 'LookupItem', item.id, 'create', null, item);
    return item;
  }

  async updateLookupItem(id: string, data: Partial<LookupItem>, actor?: ActorRequest) {
    const before = await this.lookupItemsRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.lookupItemsRepo, id, data, 'Lookup item');
    await this.logMutation(actor, 'LookupItem', id, 'update', before, updated);
    return updated;
  }

  async removeLookupItem(id: string, actor?: ActorRequest) {
    const before = await this.lookupItemsRepo.findOneBy({ id });
    await this.deleteGuarded(this.lookupItemsRepo, id, 'Lookup item');
    await this.logMutation(actor, 'LookupItem', id, 'delete', before, null);
  }

  // --- Custom Fields ---
  async findCustomFields(tenantId: string, entityType?: string): Promise<CustomFieldDefinition[]> {
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
    return this.customFieldsRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findOneCustomField(id: string): Promise<CustomFieldDefinition> {
    const f = await this.customFieldsRepo.findOneBy({ id });
    if (!f) throw new NotFoundException(`Custom field ${id} not found`);
    return f;
  }

  async createCustomField(data: Partial<CustomFieldDefinition>, actor?: ActorRequest): Promise<CustomFieldDefinition> {
    const field = await this.customFieldsRepo.save(this.customFieldsRepo.create(data));
    await this.logMutation(actor, 'CustomFieldDefinition', field.id, 'create', null, field);
    return field;
  }

  async updateCustomField(id: string, data: Partial<CustomFieldDefinition>, actor?: ActorRequest) {
    const before = await this.customFieldsRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.customFieldsRepo, id, data, 'Custom field');
    await this.logMutation(actor, 'CustomFieldDefinition', id, 'update', before, updated);
    return updated;
  }

  async removeCustomField(id: string, actor?: ActorRequest) {
    const before = await this.customFieldsRepo.findOneBy({ id });
    await this.deleteGuarded(this.customFieldsRepo, id, 'Custom field');
    await this.logMutation(actor, 'CustomFieldDefinition', id, 'delete', before, null);
  }

  // --- Numbering Schemes ---
  findNumberingSchemes(tenantId: string): Promise<NumberingScheme[]> {
    return this.numberingRepo.find({ where: { tenantId } });
  }

  async createNumberingScheme(data: Partial<NumberingScheme>, actor?: ActorRequest): Promise<NumberingScheme> {
    const scheme = await this.numberingRepo.save(this.numberingRepo.create(data));
    await this.logMutation(actor, 'NumberingScheme', scheme.id, 'create', null, scheme);
    return scheme;
  }

  async updateNumberingScheme(id: string, data: Partial<NumberingScheme>, actor?: ActorRequest) {
    const before = await this.numberingRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.numberingRepo, id, data, 'Numbering scheme');
    await this.logMutation(actor, 'NumberingScheme', id, 'update', before, updated);
    return updated;
  }

  // --- Feature Flags ---
  findFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    return this.featureFlagsRepo.find({ where: { tenantId } });
  }

  async createFeatureFlag(data: Partial<FeatureFlag>, actor?: ActorRequest): Promise<FeatureFlag> {
    const flag = await this.featureFlagsRepo.save(this.featureFlagsRepo.create(data));
    await this.logMutation(actor, 'FeatureFlag', flag.id, 'create', null, flag);
    return flag;
  }

  async updateFeatureFlag(id: string, data: Partial<FeatureFlag>, actor?: ActorRequest) {
    const before = await this.featureFlagsRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.featureFlagsRepo, id, data, 'Feature flag');
    await this.logMutation(actor, 'FeatureFlag', id, 'update', before, updated);
    return updated;
  }
  async removeFeatureFlag(id: string, actor?: ActorRequest) {
    const before = await this.featureFlagsRepo.findOneBy({ id });
    await this.deleteGuarded(this.featureFlagsRepo, id, 'Feature flag');
    await this.logMutation(actor, 'FeatureFlag', id, 'delete', before, null);
  }

  // --- Workflows ---
  findWorkflows(tenantId: string): Promise<WorkflowDefinition[]> {
    return this.workflowsRepo.find({ where: { tenantId } });
  }

  async createWorkflow(data: Partial<WorkflowDefinition>, actor?: ActorRequest): Promise<WorkflowDefinition> {
    const wf = await this.workflowsRepo.save(this.workflowsRepo.create(data));
    await this.logMutation(actor, 'WorkflowDefinition', wf.id, 'create', null, wf);
    return wf;
  }

  async updateWorkflow(id: string, data: Partial<WorkflowDefinition>, actor?: ActorRequest) {
    const before = await this.workflowsRepo.findOneBy({ id });
    const updated = await this.updateGuarded(this.workflowsRepo, id, data, 'Workflow definition');
    await this.logMutation(actor, 'WorkflowDefinition', id, 'update', before, updated);
    return updated;
  }

  findWorkflowInstances(tenantId: string): Promise<WorkflowInstance[]> {
    return this.workflowInstancesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  // --- Audit Log ---
  async logAuditEvent(data: Partial<AuditEvent>): Promise<AuditEvent> {
    const event = this.auditEventsRepo.create(data);
    return this.auditEventsRepo.save(event);
  }

  /**
   * FR-CFG-7: audit-log writes for configuration mutations (who changed what,
   * when, before/after). Non-fatal by design — a broken audit write must never
   * block the business mutation it describes.
   */
  private async logMutation(
    actor: ActorRequest | undefined,
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    beforeState: Record<string, any> | null,
    afterState: Record<string, any> | null,
  ): Promise<void> {
    try {
      await this.auditEventsRepo.save(
        this.auditEventsRepo.create({
          tenantId: actor?.headers?.['x-tenant-id'] as string,
          actorUserId: actor?.user?.sub ?? actor?.user?.id ?? null,
          entityType,
          entityId,
          action,
          beforeState,
          afterState,
          requestId: actor?.headers?.['x-request-id'] as string | undefined,
        }),
      );
    } catch {
      // Audit writes are best-effort: never fail the mutation they describe.
    }
  }

  async findAuditEvents(tenantId: string, filters?: { entityType?: string; entityId?: string; actorUserId?: string }): Promise<AuditEvent[]> {
    const where: any = { tenantId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorUserId) where.actorUserId = filters.actorUserId;
    return this.auditEventsRepo.find({ where, order: { occurredAt: 'DESC' }, take: 100 });
  }

  /**
   * FR-CFG-8: feature-flag evaluation. Branch-specific flags override
   * tenant-level ones; percentage rollout is decided deterministically from
   * the subject id (the same subject always gets the same answer, and a
   * missing subject falls back to the enabled bit alone).
   */
  async isFlagEnabled(
    tenantId: string,
    flagKey: string,
    opts?: { branchId?: string | null; subjectId?: string },
  ): Promise<boolean> {
    const flags = await this.featureFlagsRepo.find({ where: { tenantId, flagKey } });
    if (flags.length === 0) return false;

    const branchSpecific = opts?.branchId
      ? flags.find((f) => f.branchId === opts.branchId)
      : undefined;
    const flag = branchSpecific ?? flags.find((f) => !f.branchId) ?? flags[0];
    if (!flag.enabled) return false;
    if (flag.rolloutPercentage >= 100) return true;

    if (!opts?.subjectId) return flag.rolloutPercentage > 0;
    // Deterministic bucket: hash the subject into 0..99.
    const bucket = this.hashSubject(flag.id, opts.subjectId) % 100;
    return bucket < flag.rolloutPercentage;
  }

  private hashSubject(flagId: string, subjectId: string): number {
    let h = 5381;
    const key = `${flagId}:${subjectId}`;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  async findOneAuditEvent(id: string): Promise<AuditEvent> {
    const ev = await this.auditEventsRepo.findOneBy({ id });
    if (!ev) throw new NotFoundException(`Audit event ${id} not found`);
    return ev;
  }
}
