import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'payment_methods' })
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  code: string; // cash, check, bank_deposit_ref, gcash, maya, qrph, card, online

  @Column()
  name: string;

  /** Counts toward the physical cash drawer on session close. */
  @Column({ default: false })
  isCash: boolean;

  @Column({ default: false })
  requiresGatewayRef: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
