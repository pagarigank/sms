import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'notification_logs' })
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @Column()
  channel: string;

  @Column({ type: 'uuid', nullable: true })
  recipientUserId: string;

  @Column({ nullable: true, type: 'jsonb' })  recipientContact: string; // phone or email

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, any>;

  @Column({ default: 'queued' })
  status: string; // queued | sent | failed

  @Column({ nullable: true })
  providerMsgId: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
