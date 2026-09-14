import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'enrollments' })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column('uuid')
  curriculumId: string;

  @Column({ type: 'uuid', nullable: true })
  sectionId: string;

  @Column({ default: 'enrolled' })
  status: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  enrolledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  gradeLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  strandId: string;

  @Column({ type: 'uuid', nullable: true })
  programId: string;

  @Column({ type: 'uuid', nullable: true })
  previousSchoolYearId: string;

  @Column({ type: 'uuid', nullable: true })
  previousGradeLevelId: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
