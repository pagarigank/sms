import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'teaching_loads' })
export class TeachingLoad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  employeeId: string;

  @Column('uuid')
  classOfferingId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column('uuid')
  termId: string;

  @Column({ default: false })
  isSubstitute: boolean;

  @Column({ type: 'uuid', nullable: true })
  substituteForEmployeeId: string;

  @CreateDateColumn()
  createdAt: Date;
}
