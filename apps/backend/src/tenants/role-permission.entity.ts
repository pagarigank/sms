import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn()
  roleId: string;

  @PrimaryColumn()
  permissionId: string;
}
