import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_section_assignments' })
export class StudentSectionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  enrollmentId: string;

  @Column()
  sectionId: string;

  @Column()
  studentId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  assignedAt: Date;

  @Column({ nullable: true })
  assignedBy: string;

  @Column({ nullable: true })
  unassignedAt: Date;

  @Column({ nullable: true })
  unassignedBy: string;

  @Column({ nullable: true })
  unassignmentReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
