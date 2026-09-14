import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'notification_rules' })
export class NotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  eventType: string; // e.g. attendance_absence, low_balance, announcement

  @Column({ type: 'jsonb', default: () => "'{}'" })
  threshold: Record<string, any>; // e.g. { consecutive_absences: 3 }

  @Column('uuid')
  templateId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
