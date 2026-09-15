import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'fee_structures' })
export class FeeStructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  // Nullable: not used by the 6-level fee-resolution logic in
  // billing.service.ts (see tables.md G-21 note); API-created structures
  // leave it NULL. Kept for BIR-style template bookkeeping.
  @Column({ nullable: true })
  templateKey: string;

  @Column({ type: 'uuid', nullable: true })
  educationLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  gradeLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  strandId: string;

  @Column({ type: 'uuid', nullable: true })
  programId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column({ type: 'uuid', nullable: true })
  termId: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
