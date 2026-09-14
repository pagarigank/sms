import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'section_assignment_rules' })
export class SectionAssignmentRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  sectionId: string;

  @Column()
  ruleType: string;

  @Column({ type: 'jsonb' })
  ruleConfig: Record<string, any>;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
