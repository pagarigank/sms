import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'fee_structure_items' })
export class FeeStructureItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  feeStructureId: string;

  @Column('uuid')
  feeTypeId: string;

  @Column({ type: 'numeric' })
  amount: number;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: false })
  isPerUnit: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
