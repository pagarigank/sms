import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'document_requests' })
export class DocumentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  documentTemplateId: string;

  @Column({ default: 'requested' })
  status: string; // requested | fee_assessed | paid | released | rejected

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column({ nullable: true })
  releasedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date;

  @Column({ nullable: true })
  verificationCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
