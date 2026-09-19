import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_care_plans' })
@Index('idx_student_care_plans_student', ['studentId'])
export class StudentCarePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  condition: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  goals: Array<{ description: string; targetDate?: string; status: string }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  interventions: Array<{ description: string; frequency?: string; responsibleParty?: string }>;

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  reviewDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  nurseId: string;

  @Column({ nullable: true })
  physicianId: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}