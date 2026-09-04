import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'workflow_approvals' })
export class WorkflowApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  instanceId: string;

  @Column()
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
