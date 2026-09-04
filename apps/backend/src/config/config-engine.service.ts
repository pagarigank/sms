import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LookupList } from './lookup-list.entity';
import { LookupItem } from './lookup-item.entity';
import { CustomFieldDefinition } from './custom-field-definition.entity';
import { AuditEvent } from './audit-event.entity';

@Injectable()
export class ConfigEngineService {
  constructor(
    @InjectRepository(LookupList) private lookupListsRepo: Repository<LookupList>,
    @InjectRepository(LookupItem) private lookupItemsRepo: Repository<LookupItem>,
    @InjectRepository(CustomFieldDefinition) private customFieldsRepo: Repository<CustomFieldDefinition>,
    @InjectRepository(AuditEvent) private auditEventsRepo: Repository<AuditEvent>,
  ) {}

  // --- Lookup Lists ---
  async findLookupLists(tenantId: string): Promise<LookupList[]> {
    return this.lookupListsRepo.find({ where: { tenantId } });
  }

  async createLookupList(data: Partial<LookupList>): Promise<LookupList> {
    const list = this.lookupListsRepo.create(data);
    return this.lookupListsRepo.save(list);
  }

  async findLookupItems(listId: string): Promise<LookupItem[]> {
    return this.lookupItemsRepo.find({ where: { lookupListId: listId }, order: { sortOrder: 'ASC' } });
  }

  async createLookupItem(data: Partial<LookupItem>): Promise<LookupItem> {
    const item = this.lookupItemsRepo.create(data);
    return this.lookupItemsRepo.save(item);
  }

  // --- Custom Fields ---
  async findCustomFields(tenantId: string, entityType: string): Promise<CustomFieldDefinition[]> {
    return this.customFieldsRepo.find({ where: { tenantId, entityType }, order: { sortOrder: 'ASC' } });
  }

  async createCustomField(data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const field = this.customFieldsRepo.create(data);
    return this.customFieldsRepo.save(field);
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
}
