import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity({ name: 'grading_systems', synchronize: false })
@Unique('idx_grading_systems_unique', ['tenantId', 'educationLevelId', 'schoolYearId', 'branchId'])
@Index('idx_grading_systems_tenant_branch', ['tenantId', 'branchId'])
@Index('idx_grading_systems_edu_level', ['educationLevelId'])
export class GradingSystem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'branch_id', nullable: true })
  branchId: string;

  @Column('uuid', { name: 'education_level_id' })
  educationLevelId: string;

  @Column('uuid', { name: 'school_year_id' })
  schoolYearId: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column('jsonb', { default: {} })
  config: any;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
