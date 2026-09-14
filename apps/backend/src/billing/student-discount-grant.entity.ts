import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_discount_grants' })
export class StudentDiscountGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  enrollmentId: string;

  @Column('uuid')
  discountTypeId: string;

  @Column({ type: 'numeric', nullable: true })
  percentage: number;

  @Column({ type: 'numeric', nullable: true })
  fixedAmount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  supportingDocumentUrl: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  workflowInstanceId: string;

  @Column({ type: 'date', nullable: true })
  validFrom: Date;

  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @CreateDateColumn()
  createdAt: Date;
}
