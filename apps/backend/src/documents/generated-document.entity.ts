import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'generated_documents' })
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  branchId: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  templateId: string;

  @Column({ type: 'uuid', nullable: true })
  requestId: string; // NULL for bulk generation

  @Column()
  fileUrl: string; // S3 PDF

  @Column({ unique: true })
  verificationCode: string;

  @Column({ nullable: true })
  qrPayload: string;

  @Column({ nullable: true })
  releasedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date;

  @Column({ default: false })
  isVoided: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
