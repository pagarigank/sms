import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'payment_allocations' })
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  paymentId: string;

  @Column('uuid')
  invoiceId: string;

  @Column({ type: 'uuid', nullable: true })
  installmentId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amountApplied: number;

  @CreateDateColumn()
  createdAt: Date;
}
