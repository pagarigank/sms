import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'enrollments' })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  branchId: string;

  @Column()
  studentId: string;

  @Column()
  schoolYearId: string;

  @Column()
  curriculumId: string;

  @Column({ nullable: true })
  sectionId: string;

  @Column({ default: 'enrolled' })
  status: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  enrolledAt: Date;

  @Column({ nullable: true })
  gradeLevelId: string;

  @Column({ nullable: true })
  strandId: string;

  @Column({ nullable: true })
  programId: string;

  @Column({ nullable: true })
  previousSchoolYearId: string;

  @Column({ nullable: true })
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
