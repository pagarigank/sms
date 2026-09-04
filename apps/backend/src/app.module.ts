import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { TenantContextMiddleware } from './common/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'kpagarigan2',
        password: process.env.DB_PASSWORD || 'P@ssw0rd',
        database: process.env.DB_NAME || 'sms',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: ['error', 'warn'],
      }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes except auth
    consumer
      .apply(TenantContextMiddleware)
      .exclude('auth/(.*)')
      .forRoutes('*');
  }
}
