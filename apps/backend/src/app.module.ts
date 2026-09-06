import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { TenantsModule } from './tenants/tenants.module';
import { BranchesModule } from './branches/branches.module';
import { DepartmentsModule } from './departments/departments.module';
import { EducationLevelsModule } from './education-levels/education-levels.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { IamModule } from './iam/iam.module';
import { ConfigEngineModule } from './config/config.module';
import { FacilityModule } from './facility/facility.module';
import { AcademicModule } from './academic/academic.module';
import { GradingModule } from './academic/grading.module';
import { SisModule } from './sis/sis.module';
import { BillingModule } from './billing/billing.module';
import { CashieringModule } from './cashiering/cashiering.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { CommunicationsModule } from './communications/communications.module';
import { DocumentsModule } from './documents/documents.module';
import { HrModule } from './hr/hr.module';
import { ReportingModule } from './reporting/reporting.module';
import { TenantContextMiddleware } from './common/tenant-context.middleware';
import { TenantAwareDataSource } from './common/tenant-aware-data-source';
import { OverrideResolverService } from './common/override-resolver.service';
import { RateLimitGuard } from './common/rate-limit.guard';
import { HealthModule } from './common/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    HealthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        // Secret hygiene (Phase 11.1): real credentials come from the
        // environment/vault in production; dev defaults only in dev.
        if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
          throw new Error('DB_PASSWORD is required in production — secrets must not use source defaults');
        }
        return {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'kpagarigan2',
          password: process.env.DB_PASSWORD || 'P@ssw0rd',
          database: process.env.DB_NAME || 'sms',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production', // dev-only; use migrations in prod
          logging: ['error', 'warn'],
        };
      },
    }),
    AuthModule,
    UsersModule,
    IamModule,
    TenantsModule,
    BranchesModule,
    DepartmentsModule,
    EducationLevelsModule,
    ConfigEngineModule,
    FacilityModule,
    AcademicModule,
    GradingModule,
    SisModule,
    BillingModule,
    CashieringModule,
    SchedulingModule,
    CommunicationsModule,
    DocumentsModule,
    HrModule,
    ReportingModule,
  ],
  controllers: [],
  providers: [
    OverrideResolverService,
    TenantAwareDataSource,
    // Global per-tenant rate limiting (100→300 req/min; health exempted).
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      // Auth routes run before authentication — tenant comes from the login
      // body/JWT, not the middleware.
      .exclude('auth/(.*)')
      .forRoutes('*');
  }
}
