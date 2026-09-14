import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'ad_hoc_sales' })
export class AdHocSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  sessionId: string;

  @Column({ nullable: true })
  buyerName: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
