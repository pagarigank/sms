import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_learning_profiles' })
@Index('idx_student_learning_profiles_student', ['studentId'])
export class StudentLearningProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column({ nullable: true })
  primaryLearningStyle: string;

  @Column({ nullable: true })
  secondaryLearningStyle: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  learningPreferences: Array<{
    category: string;
    preference: string;
    strength: number;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  cognitiveStrengths: Array<{
    domain: string;
    score: number;
    percentile: number;
    description: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  cognitiveChallenges: Array<{
    domain: string;
    score: number;
    percentile: number;
    description: string;
    recommendedStrategies: string[];
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  executiveFunction: Array<{
    skill: string;
    rating: number;
    description: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  processingSpeed: Array<{
    measure: string;
    score: number;
    percentile: number;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  workingMemory: Array<{
    measure: string;
    score: number;
    percentile: number;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attentionRegulation: Array<{
    measure: string;
    score: number;
    percentile: number;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recommendedAccommodations: Array<{
    accommodation: string;
    rationale: string;
    priority: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recommendedInstructionalStrategies: Array<{
    strategy: string;
    rationale: string;
    applicableSubjects: string[];
  }>;

  @Column({ type: 'date', nullable: true })
  assessmentDate: Date;

  @Column({ nullable: true })
  assessedBy: string;

  @Column({ nullable: true })
  assessmentTool: string;

  @Column({ nullable: true })
  nextReassessmentDate: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}