import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'report_templates' })
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })  reportType: string; // enrollment_stats, learner_movement, revenue, ar_aging, discount_utilization, custom

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>; // { entity, filters, columns, groupBy, sortBy }

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isSystem: boolean; // true = built-in, false = user-created

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
