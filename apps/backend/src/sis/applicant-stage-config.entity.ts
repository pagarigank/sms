import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'applicant_stage_configs' })
export class ApplicantStageConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column({ nullable: true })
  educationLevelId: string;

  @Column()
  stageName: string;

  @Column()
  stageCode: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  autoAdmitOnComplete: boolean;

  @Column({ nullable: true })
  requiredDocuments: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
