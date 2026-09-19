import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_interventions' })
@Index('idx_student_interventions_student', ['studentId'])
export class StudentIntervention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  interventionName: string;

  @Column({ nullable: true })
  tier: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  focusArea: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  frequency: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ nullable: true })
  setting: string;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  groupSize: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  goals: Array<{
    description: string;
    baseline: string;
    target: string;
    measurementMethod: string;
    progress: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  progressMonitoring: Array<{
    date: string;
    dataPoint: string;
    notes?: string;
  }>;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  fidelityRating: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}