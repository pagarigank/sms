import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'permanent_records' })
export class PermanentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column('uuid')
  gradeLevelId: string;

  @Column({ type: 'jsonb' })  recordType: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  grades: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attendance: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  generalAverage: number;

  @Column({ nullable: true })
  rank: number;

  @Column({ nullable: true })
  remarks: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  verifiedByUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ nullable: true })
  verificationCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
