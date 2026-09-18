import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'grade_entries' })
export class GradeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantId', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'studentId', type: 'uuid' })
  studentId: string;

  @Column({ name: 'enrollmentId', type: 'uuid' })
  enrollmentId: string;

  @Column({ name: 'classOfferingId', type: 'uuid' })
  classOfferingId: string;

  @Column({ name: 'gradingSystemId', type: 'uuid' })
  gradingSystemId: string;

  @Column({ name: 'gradeComponentId', type: 'uuid' })
  gradeComponentId: string;

  @Column({ name: 'termId', type: 'uuid' })
  termId: string;

  @Column({ name: 'rawScore', type: 'numeric', nullable: true })
  rawScore: number;

  @Column({ name: 'maxScore', type: 'numeric', nullable: true })
  maxScore: number;

  @Column({ name: 'percentage', type: 'numeric', nullable: true })
  percentage: number;

  @Column({ name: 'transmutedGrade', type: 'numeric', nullable: true })
  transmutedGrade: number;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'isFinalized', default: false })
  isFinalized: boolean;

  @Column({ name: 'enteredByUserId', nullable: true })
  enteredByUserId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
