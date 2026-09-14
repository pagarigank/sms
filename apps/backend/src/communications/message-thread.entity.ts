import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'message_threads' })
export class MessageThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string;

  // users.id (uuid string). varchar in live DB; kept non-uuid so legacy
  // system-generated identifiers still fit.
  @Column({ nullable: true })
  createdBy: string;

  @Index()
  @Column({ type: 'jsonb', default: () => "'[]'" })
  participantIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
