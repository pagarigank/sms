import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string;

  @Column({ type: 'uuid', nullable: true })
  adHocSaleId: string;

  @Column({ type: 'uuid', nullable: true })
  cashierSessionId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column()
  method: string; // FK → payment_methods.code

  @Column({ nullable: true })
  gatewayReference: string;

  @Column({ nullable: true, unique: true })
  idempotencyKey: string;

  @Column({ default: 'completed' })
  status: string; // completed | pending | failed | refunded

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  paidAt: Date;

  @Column({ default: false })
  offlineOrigin: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  syncedAt: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  denominationBreakdown: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
