import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'dtr_records' })
export class DtrRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ type: 'date' })
  attendanceDate: Date;

  @Column({ type: 'time', nullable: true })
  timeIn: string;

  @Column({ type: 'time', nullable: true })
  timeOut: string;

  @Column({ default: 'manual' })
  source: string; // manual | biometric

  @CreateDateColumn()
  createdAt: Date;
}
