import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'cashier_sessions' })
export class CashierSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  stationId: string;

  @Column('uuid')
  cashierUserId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  openingFloat: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  denominationBreakdown: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  openedAt: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  closingActual: number;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date;

  @Column({ default: 'open' })
  status: string; // open | closed | forced_closed

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  varianceAmount: number;

  @Column({ nullable: true })
  varianceApprovedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  varianceApprovedAt: Date;

  @Column({ nullable: true })
  shiftReportUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
