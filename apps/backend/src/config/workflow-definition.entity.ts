import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'workflow_definitions' })
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  entityType: string; // discount, grade_change, refund, document

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Steps: [{role: 'Teacher', action: 'request'}, {role: 'Registrar', action: 'approve'}]
  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: any[];

  @Column({ type: 'int', default: 48 })
  slaHours: number;

  @Column({ nullable: true })
  escalationTo: string; // role or user who receives escalated requests

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
