import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_evaluations' })
@Index('idx_student_evaluations_student', ['studentId'])
export class StudentEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  evaluationType: string;

  @Column({ nullable: true })
  evaluationName: string;

  @Column({ type: 'date' })
  evaluationDate: Date;

  @Column({ nullable: true })
  evaluatorId: string;

  @Column({ nullable: true })
  evaluatorRole: string;

  @Column({ type: 'text', nullable: true })
  reasonForReferral: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  domainsAssessed: Array<{
    domain: string;
    instruments: string[];
    scores?: Record<string, string>;
    summary: string;
  }>;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  recommendations: string;

  @Column({ nullable: true })
  eligibilityDetermined: boolean;

  @Column({ nullable: true })
  eligibilityCategory: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}