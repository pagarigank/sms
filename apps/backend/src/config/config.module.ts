import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LookupList } from './lookup-list.entity';
import { LookupItem } from './lookup-item.entity';
import { CustomFieldDefinition } from './custom-field-definition.entity';
import { NumberingScheme } from './numbering-scheme.entity';
import { FeatureFlag } from './feature-flag.entity';
import { AuditEvent } from './audit-event.entity';
import { ConfigEngineService } from './config-engine.service';
import { ConfigEngineController } from './config-engine.controller';

const CONFIG_ENTITIES = [LookupList, LookupItem, CustomFieldDefinition, NumberingScheme, FeatureFlag, AuditEvent];

@Module({
  imports: [TypeOrmModule.forFeature(CONFIG_ENTITIES)],
  controllers: [ConfigEngineController],
  providers: [ConfigEngineService],
  exports: [TypeOrmModule, ConfigEngineService],
})
export class ConfigEngineModule {}
