import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'payment_plans' })
export class PaymentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  numberOfInstallments: number;

  @Column({ type: 'numeric', default: 0 })
  cashDiscountPercentage: number;

  @Column({ type: 'numeric', default: 0 })
  installmentFee: number;

  @Column({ type: 'numeric', default: 0 })
  penaltyPercentage: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
