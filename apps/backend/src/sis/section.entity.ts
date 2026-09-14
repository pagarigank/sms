import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'sections' })
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column({ type: 'uuid', nullable: true })
  gradeLevelId: string;

  @Column({ type: 'uuid', nullable: true })
  strandId: string;

  @Column({ type: 'uuid', nullable: true })
  programId: string;

  @Column()
  name: string;

  @Column({ type: 'uuid', nullable: true })
  adviserEmployeeId: string;

  @Column({ type: 'uuid', nullable: true })
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
