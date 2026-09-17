import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'grade_entries' })
@Index('idx_grade_entries_tenant', ['tenantId'])
@Index('idx_grade_entries_student_term', ['tenantId', 'studentId', 'termId'])
@Index('idx_grade_entries_class_component', ['classOfferingId', 'gradeComponentId'])
@Index('idx_grade_entries_term_locked', ['termId', 'locked'])
export class GradeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'branch_id' })
  branchId: string;

  @Column('uuid', { name: 'student_id' })
  studentId: string;

  @Column('uuid', { name: 'class_offering_id' })
  classOfferingId: string;

  @Column('uuid', { name: 'term_id' })
  termId: string;

  @Column('uuid', { name: 'grade_component_id' })
  gradeComponentId: string;

  @Column('uuid', { name: 'grading_system_id', nullable: true })
  gradingSystemId: string;

  @Column('uuid', { name: 'enrollment_id', nullable: true })
  enrollmentId: string;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  score: number;

  @Column('numeric', { precision: 5, scale: 2, nullable: true, name: 'max_score' })
  maxScore: number;

  @Column('numeric', { precision: 5, scale: 2, nullable: true })
  percentage: number;

  @Column('numeric', { precision: 5, scale: 2, nullable: true, name: 'transmuted_grade' })
  transmutedGrade: number;

  @Column({ nullable: true })
  remarks: string;

  /**
   * For Key Stage 1 (Kinder–Grade 3) descriptive grading (DO 015 s.2026).
   * Kindergarten: 'beginning' | 'developing' | 'consistent'
   * Grades 1–3:   'emerging' | 'developing' | 'approaching' | 'meeting' | 'advancing'
   */
  @Column({ name: 'descriptive_grade', nullable: true })
  descriptiveGrade: string;

  /**
   * 'numeric'        – traditional or zero-based numeric score (G4–G12)
   * 'descriptive_ks1' – qualitative descriptor only, no transmutation (Kinder–G3)
   */
  @Column({ name: 'grading_mode', default: 'numeric' })
  gradingMode: string;

  @Column({ name: 'is_manual_override', default: false })
  isManualOverride: boolean;

  @Column({ name: 'override_reason', nullable: true })
  overrideReason: string;

  @Column('uuid', { name: 'overridden_by', nullable: true })
  overriddenBy: string;

  @Column('timestamptz', { name: 'overridden_at', nullable: true })
  overriddenAt: Date;

  @Column('uuid', { name: 'entered_by_user_id', nullable: true })
  enteredByUserId: string;

  @Column({ default: false })
  locked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
