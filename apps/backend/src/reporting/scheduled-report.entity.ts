import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'scheduled_reports' })
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  reportTemplateId: string;

  @Column()
  name: string;

  @Column()
  frequency: string; // daily | weekly | monthly

  @Column({ type: 'simple-array' })
  recipients: string[]; // email addresses

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  lastRunStatus: string; // success | failed

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null; // JWT user who created the subscription

  @CreateDateColumn()
  createdAt: Date;
}
