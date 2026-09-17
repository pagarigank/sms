import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity({ name: 'student_section_assignments' })
export class StudentSectionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  sectionId: string;

  @Column('uuid')
  studentId: string;

  /**
   * Not a FK column — studentId above is the link. This relation exists so
   * roster queries can `leftJoinAndMapOne('a.student', …)` the profile in
   * without a second round-trip. `create`/`save` ignore it.
   */
  @ManyToOne(() => Student, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'studentId' })
  student?: Student;

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
