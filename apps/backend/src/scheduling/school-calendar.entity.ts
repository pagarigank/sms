import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'school_calendars' })
export class SchoolCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  schoolYearId: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: true })  isActive: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
