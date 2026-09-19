import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_goals' })
@Index('idx_student_goals_student', ['studentId'])
export class StudentGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  priority: string;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  targetDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  milestones: Array<{
    description: string;
    targetDate: string;
    completed: boolean;
    completedDate?: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  progressUpdates: Array<{
    date: string;
    progress: number;
    notes?: string;
    updatedBy?: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  linkedEntities: Array<{
    entityType: string;
    entityId: string;
  }>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}