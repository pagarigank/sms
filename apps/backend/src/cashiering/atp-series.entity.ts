import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'atp_series' })
export class AtpSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column()
  name: string;

  @Column({ type: 'bigint' })
  rangeStart: number;

  @Column({ type: 'bigint' })
  rangeEnd: number;

  @Column({ type: 'date' })
  validFrom: Date;

  @Column({ type: 'date' })
  validTo: Date;

  /** Display prefix, e.g. "OR" — source of or_number_display [G-1, G-10]. */
  @Column({ nullable: true })
  prefix: string;

  /** Display format, e.g. "OR-{year}-{number}" — {year} and {number} are substituted. */
  @Column({ nullable: true })
  formatTemplate: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
