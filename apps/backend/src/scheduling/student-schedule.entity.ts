import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_schedules' })
export class StudentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  classOfferingId: string;

  @Column('uuid')
  subjectId: string;

  @Column({ type: 'uuid', nullable: true })
  sectionId: string;

  @Column({ type: 'uuid', nullable: true })
  roomId: string;

  @Column({ type: 'jsonb' })
  timeSlot: {
    day: string;
    startTime: string;
    endTime: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
