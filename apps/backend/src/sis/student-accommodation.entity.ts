import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_accommodations' })
@Index('idx_student_accommodations_student', ['studentId'])
export class StudentAccommodation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  category: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  setting: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  responsibleParty: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}