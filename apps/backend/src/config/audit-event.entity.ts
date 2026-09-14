import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'audit_events' })
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  afterState: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ nullable: true })
  correlationId: string;

  @CreateDateColumn()
  occurredAt: Date;
}
