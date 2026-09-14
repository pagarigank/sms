import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn('uuid')
  roleId: string;

  @PrimaryColumn('uuid')
  permissionId: string;
}
