import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EducationLevel } from '../education-levels/education-level.entity';

@Entity({ name: 'grade_levels' })
export class GradeLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  educationLevelId: string;

  @ManyToOne(() => EducationLevel)
  @JoinColumn({ name: 'educationLevelId' })
  educationLevel: EducationLevel;

  @Column({ nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
