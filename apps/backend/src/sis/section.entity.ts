import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'sections' })
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  branchId: string;

  @Column()
  schoolYearId: string;

  @Column({ nullable: true })
  gradeLevelId: string;

  @Column({ nullable: true })
  strandId: string;

  @Column({ nullable: true })
  programId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  adviserEmployeeId: string;

  @Column({ nullable: true })
  roomId: string;

  @Column({ default: 40 })
  capacity: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  homeroom: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  assignmentRules: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
