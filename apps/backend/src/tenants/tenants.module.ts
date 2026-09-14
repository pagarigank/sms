import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantPlan } from './tenant-plan.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantPlan])],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
