import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity({ name: 'honor_roll_configs' })
@Unique('idx_honor_roll_unique', ['tenantId', 'educationLevelId', 'schoolYearId'])
@Index('idx_honor_roll_active', ['tenantId', 'branchId', 'educationLevelId', 'schoolYearId'])
export class HonorRollConfig {
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

  @Column('numeric', { precision: 5, scale: 2, name: 'with_honors_threshold', nullable: true })
  withHonorsThreshold: number;

  @Column('numeric', { precision: 5, scale: 2, name: 'with_high_honors_threshold', nullable: true })
  withHighHonorsThreshold: number;

  @Column('numeric', { precision: 5, scale: 2, name: 'with_highest_honors_threshold', nullable: true })
  withHighestHonorsThreshold: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
