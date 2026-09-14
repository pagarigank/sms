import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'grading_systems' })
export class GradingSystem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column('uuid')
  educationLevelId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
