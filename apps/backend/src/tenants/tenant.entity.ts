import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../branches/branch.entity';
import { TenantPlan } from './tenant-plan.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  planId: string;

  @ManyToOne(() => TenantPlan, { eager: true })
  @JoinColumn({ name: 'planId' })
  plan: TenantPlan;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  branding: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Branch, branch => branch.tenant)
  branches: Branch[];
}
