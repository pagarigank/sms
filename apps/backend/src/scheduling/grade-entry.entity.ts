import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'grade_entries' })
export class GradeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  classOfferingId: string;

  @Column('uuid')
  gradingSystemId: string;

  @Column('uuid')
  gradeComponentId: string;

  @Column('uuid')
  termId: string;

  @Column({ type: 'numeric', nullable: true })
  rawScore: number;

  @Column({ type: 'numeric', nullable: true })
  maxScore: number;

  @Column({ type: 'numeric', nullable: true })
  percentage: number;

  @Column({ type: 'numeric', nullable: true })
  transmutedGrade: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ default: false })
  isFinalized: boolean;

  @Column({ nullable: true })
  enteredByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
