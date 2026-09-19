import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_discipline_incidents' })
@Index('idx_student_discipline_incidents_student', ['studentId'])
export class StudentDisciplineIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column({ type: 'date' })
  incidentDate: Date;

  @Column({ nullable: true })
  incidentTime: string;

  @Column()
  location: string;

  @Column({ nullable: true })
  incidentType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  involvedStudents: Array<{ studentId: string; role: string }>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  witnesses: Array<{ name: string; role: string }>;

  @Column({ nullable: true })
  reportedBy: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  antecedents: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  behaviors: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  consequences: Array<{
    type: string;
    description: string;
    startDate?: string;
    endDate?: string;
    assignedBy?: string;
  }>;

  @Column({ nullable: true })
  severity: string;

  @Column({ nullable: true })
  reporterId: string;

  @Column({ type: 'date', nullable: true })
  reportDate: Date;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}