import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { EncryptedField } from '../common/encrypted-field';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string; // NULL-able; multi-branch via employee_branch_assignments

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  contactNumber: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ nullable: true })
  position: string; // FK → lookup_items

  @Column({ nullable: true })
  department: string; // FK → lookup_items

  @Column({ nullable: true })
  employmentStatus: string; // FK → lookup_items

  // Field-level encryption (AES-256-GCM) — Phase 11.1 sensitive PII.
  // Columns stay varchar; values are stored as enc:v1:... ciphertext.
  @Column({ nullable: true, transformer: EncryptedField.transformer() })
  sssNo: string; // Encrypted

  @Column({ nullable: true, transformer: EncryptedField.transformer() })
  philhealthNo: string;

  @Column({ nullable: true, transformer: EncryptedField.transformer() })
  pagibigNo: string;

  @Column({ nullable: true, transformer: EncryptedField.transformer() })
  tinNo: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
