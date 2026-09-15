import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'faculty_load_limits' })
export class FacultyLoadLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  employeeId: string;

  @Column({ type: 'numeric', default: 24 })
  maxUnits: number;

  @Column({ type: 'numeric', default: 40 })
  maxHoursPerWeek: number;

  // Raw expression, not the JS number: `default: 0.8` renders as DEFAULT '0.8'
  // (a string literal), which never matches the numeric default the database
  // reports, so every schema comparison flagged this column as drift.
  @Column({ type: 'numeric', default: () => '0.8' })
  warnOnApproachPct: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
