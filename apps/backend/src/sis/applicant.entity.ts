import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Admissions applicant (G-23).
 *
 * An applicant is a prospective student moving through the admissions
 * pipeline (applicant_stage_configs). When accepted, convertApplicantToStudent()
 * creates the actual Student record — applicants are NOT students.
 */
// Index names match 004-phase1-fixes.sql so the migration-built schema and the
// entity metadata agree (TypeORM compares indexes by name).
@Index('idx_applicants_tenant', ['tenantId'])
@Index('idx_applicants_stage', ['tenantId', 'stageId', 'status'])
@Entity({ name: 'applicants' })
export class Applicant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  previousSchool: string;

  @Column({ nullable: true })
  gradeLevelAppliedFor: string;

  @Column({ nullable: true })
  source: string;

  /** Mirrors the current stage's stageCode (new | docs | assessment | interview | accepted | enrolled). */
  @Column({ default: 'new' })
  status: string;

  @Column({ nullable: true })
  stageId: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
