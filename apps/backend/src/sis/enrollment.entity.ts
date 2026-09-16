import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'enrollments' })
// DB-level backstop for the in-app duplicate-enrollment checks: at most one
// active (enrolled|pending) enrollment per student per school year, per
// tenant. Declared here (not only in migration 021) because dev servers run
// with synchronize:true, which drops indexes it does not know about.
// Partial (WHERE status IN ...) so terminal statuses don't block re-enrollment.
@Index('uq_enrollments_active_per_year', ['tenantId', 'studentId', 'schoolYearId'], { unique: true, where: "\"status\" IN ('enrolled', 'pending')" })
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
