import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'attendance_excuses' })
export class AttendanceExcuse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  attendanceRecordId: string;

  @Column()
  excuseType: string;

  @Column({ type: 'uuid', nullable: true })
  description: string;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewedByUserId: string;

  @Column({ nullable: true })
  reviewNotes: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
