import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './notification-template.entity';
import { NotificationRule } from './notification-rule.entity';
import { ChannelConfig } from './channel-config.entity';
import { NotificationLog } from './notification-log.entity';
import { Announcement } from './announcement.entity';
import { MessageThread } from './message-thread.entity';
import { Message } from './message.entity';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';

const COMMS_ENTITIES = [
  NotificationTemplate, NotificationRule, ChannelConfig,
  NotificationLog, Announcement, MessageThread, Message,
];

@Module({
  imports: [TypeOrmModule.forFeature(COMMS_ENTITIES)],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
