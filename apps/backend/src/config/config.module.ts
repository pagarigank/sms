import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LookupList } from './lookup-list.entity';
import { LookupItem } from './lookup-item.entity';
import { CustomFieldDefinition } from './custom-field-definition.entity';
import { NumberingScheme } from './numbering-scheme.entity';
import { FeatureFlag } from './feature-flag.entity';
import { AuditEvent } from './audit-event.entity';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowApproval } from './workflow-approval.entity';
import { ConfigEngineService } from './config-engine.service';
import { ConfigEngineController } from './config-engine.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';

const CONFIG_ENTITIES = [
  LookupList, LookupItem, CustomFieldDefinition, NumberingScheme, FeatureFlag, AuditEvent,
  WorkflowDefinition, WorkflowInstance, WorkflowApproval,
];

@Module({
  imports: [TypeOrmModule.forFeature(CONFIG_ENTITIES)],
  controllers: [ConfigEngineController, WorkflowController],
  providers: [ConfigEngineService, WorkflowService],
  exports: [TypeOrmModule, ConfigEngineService, WorkflowService],
})
export class ConfigEngineModule {}
