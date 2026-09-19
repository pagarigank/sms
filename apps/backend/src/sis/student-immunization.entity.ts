import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_immunizations' })
@Index('idx_student_immunizations_student', ['studentId'])
export class StudentImmunization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  vaccineName: string;

  @Column()
  vaccineCode: string;

  @Column({ type: 'date' })
  administeredDate: Date;

  @Column({ type: 'date', nullable: true })
  nextDueDate: Date;

  @Column({ nullable: true })
  doseNumber: string;

  @Column({ nullable: true })
  lotNumber: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  administeredBy: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'complete' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}