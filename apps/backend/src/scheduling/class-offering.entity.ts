import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'class_offerings' })
export class ClassOffering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column('uuid')
  termId: string;

  @Column('uuid')
  sectionId: string;

  @Column('uuid')
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  facultyEmployeeId: string;

  @Column({ type: 'uuid', nullable: true })
  roomId: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  timeSlots: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;

  @Column({ type: 'numeric', default: 0 })
  units: number;

  @Column({ type: 'numeric', default: 0 })
  hoursPerWeek: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
