import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'curriculum_subjects' })
export class CurriculumSubject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  curriculumId: string;

  @Column()
  subjectId: string;

  @Column({ nullable: true })
  termId: string;

  @Column({ nullable: true })
  prerequisiteSubjectId: string;

  @Column({ nullable: true })
  coRequisiteSubjectId: string;

  @Column({ nullable: true })
  order: number;

  @Column({ nullable: true })
  effectiveGradingSystemId: string;

  @CreateDateColumn()
  createdAt: Date;
}
