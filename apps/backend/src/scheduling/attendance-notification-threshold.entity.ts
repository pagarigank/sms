import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'attendance_notification_thresholds' })
export class AttendanceNotificationThreshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  educationLevelId: string;

  @Column({ type: 'numeric', default: 3 })
  absenceCountThreshold: number;

  @Column({ type: 'numeric', default: 3 })
  tardyCountThreshold: number;

  @Column({ type: 'numeric', default: 5 })
  consecutiveAbsenceThreshold: number;

  @Column({ default: 'email' })
  notificationChannel: string;

  @Column({ default: true })
  notifyGuardian: boolean;

  @Column({ default: false })
  notifyAdviser: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
