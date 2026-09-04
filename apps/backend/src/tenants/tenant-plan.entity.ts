import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'tenant_plans' })
export class TenantPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  planKey: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  maxBranches: number;

  @Column({ nullable: true })
  maxStudents: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  modules: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
