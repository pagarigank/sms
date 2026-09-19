import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_sel_assessments' })
@Index('idx_student_sel_assessments_student', ['studentId'])
export class StudentSELAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  assessmentName: string;

  @Column({ nullable: true })
  assessmentType: string;

  @Column({ type: 'date' })
  assessmentDate: Date;

  @Column({ nullable: true })
  assessorId: string;

  @Column({ nullable: true })
  assessorRole: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  competencies: Array<{
    competency: string;
    score: number;
    maxScore: number;
    percentile?: number;
    level: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  strengths: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  areasForGrowth: string[];

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  recommendations: string;

  @Column({ default: 'complete' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}