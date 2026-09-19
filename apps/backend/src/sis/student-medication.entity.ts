import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_medications' })
@Index('idx_student_medications_student', ['studentId'])
export class StudentMedication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  medicationName: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  dosage: string;

  @Column({ nullable: true })
  route: string;

  @Column({ nullable: true })
  frequency: string;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  prescriber: string;

  @Column({ nullable: true })
  prescriberContact: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  administrationTimes: string[];

  @Column({ nullable: true })
  indication: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}