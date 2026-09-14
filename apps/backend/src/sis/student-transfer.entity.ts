import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_transfers' })
export class StudentTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  fromBranchId: string;

  @Column('uuid')
  toBranchId: string;

  @Column({ type: 'uuid', nullable: true })
  fromSchoolYearId: string;

  @Column({ type: 'uuid', nullable: true })
  toSchoolYearId: string;

  @Column({ type: 'uuid', nullable: true })
  fromGradeLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  toGradeLevelId: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  completedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
