import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'grade_change_requests' })
export class GradeChangeRequest {
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
  gradeEntryId: string;

  @Column({ type: 'uuid', nullable: true })
  workflowInstanceId: string;

  @Column('uuid')
  requestedByUserId: string;

  @Column({ type: 'numeric', nullable: true })
  oldScore: number;

  @Column({ type: 'numeric', nullable: true })
  newScore: number;

  @Column({ type: 'uuid', nullable: true })
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
