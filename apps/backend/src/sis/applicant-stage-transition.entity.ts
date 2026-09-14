import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'applicant_stage_transitions' })
export class ApplicantStageTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  fromStageId: string;

  @Column('uuid')
  toStageId: string;

  @Column({ nullable: true })
  requiredRole: string;

  @Column({ nullable: true })
  autoTransition: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
