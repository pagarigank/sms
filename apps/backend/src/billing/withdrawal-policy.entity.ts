import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'withdrawal_policies' })
export class WithdrawalPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  withinDays: number;

  @Column({ type: 'numeric' })
  refundPercentage: number;

  @Column({ default: true })
  isProRated: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
