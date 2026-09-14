import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'series_counters' })
export class SeriesCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  atpSeriesId: string;

  @Column({ type: 'bigint', default: 0 })
  counterValue: number;

  @Column({ type: 'bigint', nullable: true })
  reservedBlockStart: number;

  @Column({ type: 'bigint', nullable: true })
  reservedBlockEnd: number;

  @Column({ type: 'uuid', nullable: true })
  sessionId: string;

  @Column({ type: 'timestamptz', nullable: true })
  reservedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
