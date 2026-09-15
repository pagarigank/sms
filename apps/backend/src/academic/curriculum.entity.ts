import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'curricula' })
export class Curriculum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column('uuid')
  educationLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  gradeLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  strandId: string;

  @Column({ type: 'uuid', nullable: true })
  programId: string;

  @Column('uuid')
  schoolYearId: string;

  // Version label ("2026.1"), not an identifier.
  @Column({ nullable: true })
  versionLabel: string;

  @Column({ default: 'draft' })
  status: string;

  // Clone metadata (FR-ACA-6)
  @Column({ nullable: true })
  clonedFromCurriculumId: string;

  @Column({ type: 'timestamptz', nullable: true })
  clonedAt: Date;

  @Column({ nullable: true })
  clonedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
