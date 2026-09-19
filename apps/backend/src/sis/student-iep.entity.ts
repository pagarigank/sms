import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_ieps' })
@Index('idx_student_ieps_student', ['studentId'])
export class StudentIEP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  iepNumber: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  lastReviewDate: Date;

  @Column({ type: 'date', nullable: true })
  nextReviewDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  caseManagerId: string;

  @Column({ nullable: true })
  primaryDisability: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  secondaryDisabilities: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  presentLevels: Array<{ domain: string; description: string }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  goals: Array<{
    id: string;
    domain: string;
    description: string;
    criteria: string;
    measurementMethod: string;
    progress: string;
    targetDate: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  services: Array<{
    serviceType: string;
    frequency: string;
    duration: string;
    location: string;
    providerId?: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  accommodations: Array<{
    category: string;
    description: string;
    setting: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  modifications: Array<{
    category: string;
    description: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  supplementaryAids: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  assessmentParticipation: Array<{
    assessment: string;
    participationType: string;
    accommodations?: string[];
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  transitionPlan: Array<{
    area: string;
    goal: string;
    activity: string;
    responsibleParty: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  teamMembers: Array<{
    role: string;
    name: string;
    attended: boolean;
  }>;

  @Column({ nullable: true })
  parentConsentDate: Date;

  @Column({ nullable: true })
  parentConsentGiven: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}