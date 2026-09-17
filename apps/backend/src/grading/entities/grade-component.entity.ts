import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'grade_components' })
@Index('idx_grade_components_tenant', ['tenantId'])
@Index('idx_grade_components_grading', ['gradingSystemId'])
export class GradeComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'grading_system_id' })
  gradingSystemId: string;

  @Column()
  name: string;

  @Column('numeric', { precision: 5, scale: 2 })
  weight: number;

  @Column('int', { nullable: true })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
