import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invoices' })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column({ type: 'uuid', nullable: true })
  termId: string;

  @Column({ nullable: true })
  invoiceNumber: string;

  @Column({ type: 'numeric', default: 0 })
  totalAmount: number;

  @Column({ type: 'numeric', default: 0 })
  discountAmount: number;

  @Column({ type: 'numeric', default: 0 })
  penaltyAmount: number;

  @Column({ type: 'numeric', default: 0 })
  paidAmount: number;

  @Column({ type: 'numeric', default: 0 })
  balance: number;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'uuid', nullable: true })
  paymentPlanId: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
