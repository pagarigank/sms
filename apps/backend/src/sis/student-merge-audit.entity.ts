import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'student_merge_audit' })
export class StudentMergeAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  primaryStudentId: string;

  @Column('uuid')
  mergedStudentId: string;

  @Column({ nullable: true })
  mergeReason: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  mergedData: Record<string, any>;

  @Column({ nullable: true })
  mergedBy: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  mergedAt: Date;

  @Column({ default: false })
  isUndone: boolean;

  @Column({ nullable: true })
  undoneBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  undoneAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
