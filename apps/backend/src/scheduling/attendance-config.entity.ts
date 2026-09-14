import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'attendance_config' })
export class AttendanceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column('uuid')
  educationLevelId: string;

  @Column({ default: 'daily' })
  captureMode: string;

  @Column({ default: true })
  allowLateSubmission: boolean;

  @Column({ type: 'numeric', default: 15 })
  lateGracePeriodMinutes: number;

  @Column({ default: true })  notifyGuardianOnAbsence: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
