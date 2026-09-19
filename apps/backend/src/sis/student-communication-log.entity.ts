import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_communication_logs' })
@Index('idx_student_communication_logs_student', ['studentId'])
export class StudentCommunicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column({ type: 'date' })
  communicationDate: Date;

  @Column({ nullable: true })
  communicationTime: string;

  @Column()
  communicationType: string;

  @Column({ nullable: true })
  communicationMethod: string;

  @Column({ nullable: true })
  direction: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactRelationship: string;

  @Column({ nullable: true })
  contactRole: string;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  initiatedBy: string;

  @Column({ nullable: true })
  initiatorRole: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  participants: Array<{
    name: string;
    role: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  actionItems: Array<{
    description: string;
    assignedTo: string;
    dueDate?: string;
    completed: boolean;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  followUpRequired: Array<{
    description: string;
    dueDate: string;
    completed: boolean;
  }>;

  @Column({ default: 'logged' })
  status: string;

  @Column({ nullable: true })
  linkedEntityType: string;

  @Column({ nullable: true })
  linkedEntityId: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}