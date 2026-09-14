import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'notification_templates' })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column()
  eventType: string; // absence, low_balance, grade_posted, document_ready

  @Column()
  channel: string; // sms | email | push | in_app

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  bodyTemplate: string; // Handlebars with {{merge_fields}}

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
