import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

// BIR requirement: no duplicate OR numbers for the same tenant/branch/ATP series
// (created by 012-hardening-rls-and-or-race.sql). Declared here so the entity
// metadata carries the constraint too, instead of only the deployed schema.
@Index('uq_series_counters_scope', ['tenantId', 'branchId', 'atpSeriesId'], { unique: true })
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
