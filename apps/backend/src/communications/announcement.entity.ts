import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'announcements' })
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string; // NULL = tenant-wide

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  audienceType: string; // all | grade_level | section | branch | custom

  @Column({ type: 'simple-array', default: '' })
  audienceIds: string[];

  @Column({ type: 'simple-array', default: 'sms,email,push' })
  channel: string[];

  @Column({ nullable: true })
  createdBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
