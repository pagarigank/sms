import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'attendance_records' })
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  sectionId: string;

  @Column('uuid')
  classOfferingId: string;

  @Column({ type: 'date' })
  attendanceDate: Date;

  @Column({ type: 'int', nullable: true })
  periodNumber: number;

  @Column()
  status: string;

  @Column({ type: 'int', nullable: true })
  minutesLate: number;

  @Column({ nullable: true })
  excuseReason: string;

  @Column({ nullable: true })
  recordedByUserId: string;

  @Column({ nullable: true })
  verifiedByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
