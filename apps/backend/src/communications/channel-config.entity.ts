import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'channel_configs' })
export class ChannelConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string; // NULL = tenant-wide

  @Column()
  channel: string; // sms | email | push

  @Column()
  provider: string; // Semaphore/Movider/SES/SendGrid/FCM/APNs

  @Column()
  credentialsRef: string; // Vault ref, never in logs

  @Column({ nullable: true })
  senderId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
