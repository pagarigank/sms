import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'workflow_approvals' })
export class WorkflowApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  instanceId: string;

  @Column('uuid')
  approverUserId: string;

  @Column({ type: 'int' })
  stepIndex: number;

  @Column()
  decision: string; // approved, rejected, escalated

  @Column({ nullable: true })
  reason: string;

  @Column({ type: 'timestamptz' })
  decidedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
