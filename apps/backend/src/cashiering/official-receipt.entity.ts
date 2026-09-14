import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'official_receipts' })
export class OfficialReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  paymentId: string;

  @Column()
  orNumber: string; // Gapless sequential numeric part (zero-padded varchar, NOT a uuid)

  @Column({ nullable: true })
  orNumberDisplay: string; // Formatted: OR-2026-0001234

  @Column()
  atpSeriesId: string;

  // BIR-mandatory fields (FR-CSH-4)
  @Column({ nullable: true })
  payorName: string;

  @Column({ nullable: true })
  payorTin: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ default: false })
  isTaxExempt: boolean;

  @Column({ default: false })
  isVoided: boolean;

  @Column({ nullable: true })
  voidReason: string;

  @Column({ nullable: true })
  reversedBy: string; // FK → official_receipts (reversal OR)

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  issuedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
