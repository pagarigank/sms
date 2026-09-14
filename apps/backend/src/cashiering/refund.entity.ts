import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'refunds' })
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  originalOrId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column()
  invoiceId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ default: 'pending' })
  status: string; // pending | approved | completed

  @CreateDateColumn()
  createdAt: Date;
}
