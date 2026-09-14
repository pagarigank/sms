import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'installment_schedules' })
export class InstallmentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  invoiceId: string;

  @Column('uuid')
  paymentPlanId: string;

  @Column({ type: 'int' })
  installmentNumber: number;

  @Column({ type: 'numeric' })
  amount: number;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'numeric', default: 0 })
  penaltyAmount: number;

  @Column({ type: 'numeric', default: 0 })
  paidAmount: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'date', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
