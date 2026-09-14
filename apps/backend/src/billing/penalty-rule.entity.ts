import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'penalty_rules' })
export class PenaltyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1 })
  gracePeriodDays: number;

  @Column({ type: 'numeric', default: 0 })
  penaltyPercentage: number;

  @Column({ type: 'numeric', default: 0 })
  penaltyFixedAmount: number;

  @Column({ type: 'numeric', default: 0 })
  maxPenaltyAmount: number;

  @Column({ default: 'daily' })
  computationType: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
