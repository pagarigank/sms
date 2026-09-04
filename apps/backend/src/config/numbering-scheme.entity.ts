import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'numbering_schemes' })
export class NumberingScheme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column()
  name: string;

  @Column()
  entityType: string;

  @Column()
  format: string;

  @Column({ type: 'bigint', default: 0 })
  counterValue: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
