import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_family_contexts' })
@Index('idx_student_family_contexts_student', ['studentId'])
export class StudentFamilyContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column({ nullable: true })
  householdType: string;

  @Column({ nullable: true })
  primaryLanguage: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  languagesSpoken: Array<{
    language: string;
    proficiency: string;
    primary: boolean;
  }>;

  @Column({ nullable: true })
  culturalBackground: string;

  @Column({ nullable: true })
  culturalConsiderations: string;

  @Column({ nullable: true })
  religion: string;

  @Column({ nullable: true })
  religiousConsiderations: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  householdMembers: Array<{
    name: string;
    relationship: string;
    age?: number;
    occupation?: string;
    contactNumber?: string;
    email?: string;
    livesWithStudent: boolean;
    isEmergencyContact: boolean;
    isAuthorizedPickup: boolean;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  significantRelationships: Array<{
    name: string;
    relationship: string;
    significance: string;
    contactInfo?: string;
  }>;

  @Column({ nullable: true })
  housingSituation: string;

  @Column({ nullable: true })
  transportationToSchool: string;

  @Column({ nullable: true })
  foodSecurityStatus: string;

  @Column({ nullable: true })
  technologyAccess: string;

  @Column({ nullable: true })
  internetAccess: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  communityResources: Array<{
    resource: string;
    contactInfo: string;
    notes?: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  barriersToEngagement: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  preferredCommunicationMethods: Array<{
    method: string;
    language: string;
    timePreference?: string;
  }>;

  @Column({ nullable: true })
  lastUpdatedBy: string;

  @Column({ type: 'date', nullable: true })
  lastReviewDate: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}