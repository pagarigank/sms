import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SchoolYear } from './school-year.entity';

@Entity({ name: 'terms' })
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  schoolYearId: string;

  @ManyToOne(() => SchoolYear)
  @JoinColumn({ name: 'schoolYearId' })
  schoolYear: SchoolYear;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  sequence: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  gradingDeadline: Date;

  @CreateDateColumn()
  createdAt: Date;
}
