import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guardian } from '../sis/guardian.entity';
import { StudentGuardian } from '../sis/student-guardian.entity';
import { UserPersonLink } from '../users/user-person-link.entity';
import { MessageThread } from '../communications/message-thread.entity';
import { StudentAccessService } from './student-access.service';

/**
 * Cross-cutting access-scope providers. Global so the `SelfServiceScopeGuard`
 * (registered in AppModule) and any controller can resolve ownership without
 * each feature module re-importing it — mirrors the `@Global() IamModule`
 * pattern used for `PolicyService`.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Guardian, StudentGuardian, UserPersonLink, MessageThread]),
  ],
  providers: [StudentAccessService],
  exports: [StudentAccessService],
})
export class AccessModule {}
