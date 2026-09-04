import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'section_assignment_rules' })
export class SectionAssignmentRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
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
