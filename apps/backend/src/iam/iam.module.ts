import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../tenants/role.entity';
import { Permission } from '../tenants/permission.entity';
import { RolePermission } from '../tenants/role-permission.entity';
import { UserRole } from '../tenants/user-role.entity';
import { RebacEdge } from '../tenants/rebac-edge.entity';
import { PolicyService } from './policy.service';
import { IamController } from './iam.controller';

const IAM_ENTITIES = [Role, Permission, RolePermission, UserRole, RebacEdge];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(IAM_ENTITIES)],
  controllers: [IamController],
  providers: [PolicyService],
  exports: [TypeOrmModule, PolicyService],
})
export class IamModule {}
