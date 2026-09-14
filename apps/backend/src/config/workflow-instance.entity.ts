import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'workflow_instances' })
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  workflowDefinitionId: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column({ type: 'int', default: 0 })
  currentStep: number;

  @Column({ default: 'pending' })
  status: string; // pending, approved, rejected, escalated, cancelled

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  requestedAt: Date;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
