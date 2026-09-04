import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  tenantId: string;

  @PrimaryColumn()
  roleId: string;

  @Column({ nullable: true })
  branchId: string;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ nullable: true })
  grantedBy: string;
}
