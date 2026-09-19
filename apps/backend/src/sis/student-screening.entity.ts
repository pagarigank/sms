import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_screenings' })
@Index('idx_student_screenings_student', ['studentId'])
export class StudentScreening {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  screeningType: string;

  @Column({ nullable: true })
  screeningName: string;

  @Column({ type: 'date' })
  screeningDate: Date;

  @Column({ nullable: true })
  result: string;

  @Column({ nullable: true })
  value: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  referenceRange: string;

  @Column({ nullable: true })
  performedBy: string;

  @Column({ nullable: true })
  followUpRequired: boolean;

  @Column({ nullable: true })
  followUpNotes: string;

  @Column({ nullable: true })
  nextScreeningDate: Date;

  @Column({ default: 'complete' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}