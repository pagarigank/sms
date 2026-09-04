import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'curricula' })
export class Curriculum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column()
  educationLevelId: string;

  @Column({ nullable: true })
  gradeLevelId: string;

  @Column({ nullable: true })
  strandId: string;

  @Column({ nullable: true })
  programId: string;

  @Column()
  schoolYearId: string;

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
