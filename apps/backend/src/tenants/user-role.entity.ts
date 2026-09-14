import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  tenantId: string;

  @PrimaryColumn('uuid')
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  grantedBy: string;
}
