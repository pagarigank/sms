import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'grade_change_requests' })
@Index('idx_grade_change_tenant', ['tenantId'])
@Index('idx_grade_change_student', ['studentId', 'status'])
export class GradeChangeRequest {
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

  @Column('jsonb', { name: 'old_grade', nullable: true })
  oldGrade: any;

  @Column('jsonb', { name: 'new_grade' })
  newGrade: any;

  @Column()
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column('uuid', { name: 'requested_by', nullable: true })
  requestedBy: string;

  @Column('uuid', { name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column('timestamptz', { name: 'approved_at', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
