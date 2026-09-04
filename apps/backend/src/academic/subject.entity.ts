import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: 'subjects' })
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  code: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  units: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  hoursPerWeek: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  lectureHours: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  labHours: number;

  @Column({ default: true })
  isCore: boolean;

  @Column({ default: false })
  isElective: boolean;

  @Column({ nullable: true })
  learningArea: string;

  @Column({ nullable: true })
  coRequisiteSubjectId: string;

  @Column({ nullable: true })
  versionLabel: string;

  @CreateDateColumn()
  createdAt: Date;
}
