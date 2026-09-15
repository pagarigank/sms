import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'curriculum_subjects' })
export class CurriculumSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  curriculumId: string;

  @Column('uuid')
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  termId: string;

  @Column({ type: 'uuid', nullable: true })
  prerequisiteSubjectId: string;

  @Column({ type: 'uuid', nullable: true })
  coRequisiteSubjectId: string;

  @Column({ type: 'int', nullable: true })
  order: number;

  @Column({ nullable: true })
  effectiveGradingSystemId: string;

  @CreateDateColumn()
  createdAt: Date;
}
