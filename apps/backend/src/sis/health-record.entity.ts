import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'health_records' })
export class HealthRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column()
  recordType: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  recordDate: Date;

  @Column({ nullable: true })
  recordedByUserId: string;

  @Column({ nullable: true })
  clinician: string;

  @Column({ nullable: true })
  diagnosis: string;

  @Column({ nullable: true })
  treatment: string;

  @Column({ nullable: true })
  medication: string;

  @Column({ nullable: true })
  followUpDate: Date;

  @Column({ nullable: true })
  parentNotified: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attachments: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
