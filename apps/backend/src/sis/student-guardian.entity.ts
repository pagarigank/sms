import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_guardians' })
export class StudentGuardian {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  guardianId: string;

  @Column({ nullable: true })
  relationship: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: true })
  isEmergencyContact: boolean;

  @Column({ default: true })
  canReceiveNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
