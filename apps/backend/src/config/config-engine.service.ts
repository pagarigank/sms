import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async createLookupList(data: Partial<LookupList>): Promise<LookupList> {
    const list = this.lookupListsRepo.create(data);
    return this.lookupListsRepo.save(list);
  }

  async findOneLookupList(id: string): Promise<LookupList> {
    const list = await this.lookupListsRepo.findOneBy({ id });
    if (!list) throw new NotFoundException(`Lookup list ${id} not found`);
    return list;
  }

  async updateLookupList(id: string, data: Partial<LookupList>) {
    return this.updateGuarded(this.lookupListsRepo, id, data, 'Lookup list');
  }

  async removeLookupList(id: string) {
    const items = await this.lookupItemsRepo.count({ where: { lookupListId: id } });
    if (items > 0) throw new ConflictException(`Lookup list ${id} still has ${items} items — delete them first`);
    await this.deleteGuarded(this.lookupListsRepo, id, 'Lookup list');
  }

  async findLookupItemsFlat(tenantId: string, lookupListId?: string): Promise<LookupItem[]> {
    const where: any = { tenantId };
    if (lookupListId) where.lookupListId = lookupListId;
    return this.lookupItemsRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findLookupItems(listId: string): Promise<LookupItem[]> {
    return this.lookupItemsRepo.find({ where: { lookupListId: listId }, order: { sortOrder: 'ASC' } });
  }

  async createLookupItem(data: Partial<LookupItem>): Promise<LookupItem> {
    const item = this.lookupItemsRepo.create(data);
    return this.lookupItemsRepo.save(item);
  }

  updateLookupItem(id: string, data: Partial<LookupItem>) {
    return this.updateGuarded(this.lookupItemsRepo, id, data, 'Lookup item');
  }

  removeLookupItem(id: string) {
    return this.deleteGuarded(this.lookupItemsRepo, id, 'Lookup item');
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

  async createCustomField(data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const field = this.customFieldsRepo.create(data);
    return this.customFieldsRepo.save(field);
  }

  updateCustomField(id: string, data: Partial<CustomFieldDefinition>) {
    return this.updateGuarded(this.customFieldsRepo, id, data, 'Custom field');
  }

  removeCustomField(id: string) {
    return this.deleteGuarded(this.customFieldsRepo, id, 'Custom field');
  }

  // --- Numbering Schemes ---
  findNumberingSchemes(tenantId: string): Promise<NumberingScheme[]> {
    return this.numberingRepo.find({ where: { tenantId } });
  }

  createNumberingScheme(data: Partial<NumberingScheme>): Promise<NumberingScheme> {
    return this.numberingRepo.save(this.numberingRepo.create(data));
  }

  updateNumberingScheme(id: string, data: Partial<NumberingScheme>) {
    return this.updateGuarded(this.numberingRepo, id, data, 'Numbering scheme');
  }

  // --- Feature Flags ---
  findFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
    return this.featureFlagsRepo.find({ where: { tenantId } });
  }

  createFeatureFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return this.featureFlagsRepo.save(this.featureFlagsRepo.create(data));
  }

  updateFeatureFlag(id: string, data: Partial<FeatureFlag>) {
    return this.updateGuarded(this.featureFlagsRepo, id, data, 'Feature flag');
  }

  removeFeatureFlag(id: string) {
    return this.deleteGuarded(this.featureFlagsRepo, id, 'Feature flag');
  }

  // --- Workflows ---
  findWorkflows(tenantId: string): Promise<WorkflowDefinition[]> {
    return this.workflowsRepo.find({ where: { tenantId } });
  }

  createWorkflow(data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    return this.workflowsRepo.save(this.workflowsRepo.create(data));
  }

  updateWorkflow(id: string, data: Partial<WorkflowDefinition>) {
    return this.updateGuarded(this.workflowsRepo, id, data, 'Workflow definition');
  }

  findWorkflowInstances(tenantId: string): Promise<WorkflowInstance[]> {
    return this.workflowInstancesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  // --- Audit Log ---
  async logAuditEvent(data: Partial<AuditEvent>): Promise<AuditEvent> {
    const event = this.auditEventsRepo.create(data);
    return this.auditEventsRepo.save(event);
  }

  async findAuditEvents(tenantId: string, filters?: { entityType?: string; entityId?: string; actorUserId?: string }): Promise<AuditEvent[]> {
    const where: any = { tenantId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorUserId) where.actorUserId = filters.actorUserId;
    return this.auditEventsRepo.find({ where, order: { occurredAt: 'DESC' }, take: 100 });
  }

  async findOneAuditEvent(id: string): Promise<AuditEvent> {
    const ev = await this.auditEventsRepo.findOneBy({ id });
    if (!ev) throw new NotFoundException(`Audit event ${id} not found`);
    return ev;
  }
}
