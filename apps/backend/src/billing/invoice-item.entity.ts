import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'invoice_items' })
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  invoiceId: string;

  @Column('uuid')
  feeTypeId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'numeric' })
  amount: number;

  @Column({ type: 'numeric', default: 0 })
  discountAmount: number;

  @Column({ type: 'numeric', default: 0 })
  taxAmount: number;

  @Column({ type: 'numeric', default: 0 })
  netAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
