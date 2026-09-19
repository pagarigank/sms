import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_504_plans' })
@Index('idx_student_504_plans_student', ['studentId'])
export class Student504Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  planNumber: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
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
  disability: string;

  @Column({ type: 'text', nullable: true })
  majorLifeActivity: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  accommodations: Array<{
    category: string;
    description: string;
    setting: string;
    responsibleParty?: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  services: Array<{
    serviceType: string;
    frequency: string;
    duration: string;
    providerId?: string;
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