import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_transfers' })
export class StudentTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  studentId: string;

  @Column()
  fromBranchId: string;

  @Column()
  toBranchId: string;

  @Column({ nullable: true })
  fromSchoolYearId: string;

  @Column({ nullable: true })
  toSchoolYearId: string;

  @Column({ nullable: true })
  fromGradeLevelId: string;

  @Column({ nullable: true })
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
