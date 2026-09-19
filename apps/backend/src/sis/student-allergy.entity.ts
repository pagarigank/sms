import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'student_allergies' })
@Index('idx_student_allergies_student', ['studentId'])
export class StudentAllergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column()
  allergen: string;

  @Column({ nullable: true })
  allergenType: string;

  @Column({ nullable: true })
  severity: string;

  @Column({ nullable: true })
  reaction: string;

  @Column({ nullable: true })
  treatment: string;

  @Column({ nullable: true })
  epinephrineRequired: boolean;

  @Column({ nullable: true })
  diagnosedDate: Date;

  @Column({ nullable: true })
  verifiedBy: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}