import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaService } from './mfa.service';
import { GuardianAuthService } from './guardian-auth.service';
import { ImpersonationService } from './impersonation.service';
import { User } from '../users/user.entity';
import { UserRole } from '../tenants/user-role.entity';
import { Role } from '../tenants/role.entity';
import { AuditEvent } from '../config/audit-event.entity';
import { SessionService } from '../users/session.service';
import { UserSession } from '../users/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role, AuditEvent, UserSession]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MfaService, GuardianAuthService, ImpersonationService, SessionService],
  exports: [AuthService, MfaService, GuardianAuthService, ImpersonationService, JwtModule, SessionService],
})
export class AuthModule {}
