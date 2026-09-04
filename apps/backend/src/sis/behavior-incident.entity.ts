import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'behavior_incidents' })
export class BehaviorIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  studentId: string;

  @Column({ nullable: true })
  enrollmentId: string;

  @Column()
  incidentType: string;

  @Column()
  description: string;

  @Column({ type: 'date' })
  incidentDate: Date;

  @Column({ nullable: true })
  incidentLocation: string;

  @Column({ nullable: true })
  witnesses: string;

  @Column({ nullable: true })
  actionTaken: string;

  @Column({ nullable: true })
  reportedBy: string;

  @Column({ nullable: true })
  reportedToUserId: string;

  @Column({ default: 'open' })
  status: string;

  @Column({ nullable: true })
  resolution: string;

  @Column({ nullable: true })
  followUpDate: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attachments: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
