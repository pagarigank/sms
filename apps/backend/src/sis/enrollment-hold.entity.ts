import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'enrollment_holds' })
export class EnrollmentHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  studentId: string;

  @Column()
  holdType: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: true })
  blocksSchedule: boolean;

  @Column({ default: false })
  blocksTor: boolean;

  @Column({ default: false })
  blocksExamPermit: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  placedBy: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  placedAt: Date;

  @Column({ nullable: true })
  releasedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
