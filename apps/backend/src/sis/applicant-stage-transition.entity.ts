import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'applicant_stage_transitions' })
export class ApplicantStageTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  fromStageId: string;

  @Column()
  toStageId: string;

  @Column({ nullable: true })
  requiredRole: string;

  @Column({ nullable: true })
  autoTransition: boolean;

  @Column({ nullable: true })
  conditions: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
