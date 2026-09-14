import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'discount_types' })
export class DiscountType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'percentage' })
  discountMode: string;

  @Column({ type: 'numeric', default: 0 })
  defaultPercentage: number;

  @Column({ type: 'numeric', default: 0 })
  defaultAmount: number;

  @Column({ default: true })
  requiresApproval: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isScholarship: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
