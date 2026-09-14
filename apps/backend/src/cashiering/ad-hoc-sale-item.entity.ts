import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'ad_hoc_sale_items' })
export class AdHocSaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  adHocSaleId: string;

  @Column()
  description: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  lineTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
