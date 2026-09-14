import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EncryptedField } from '../common/encrypted-field';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @Column({ nullable: true, unique: true })
  lrn: string;

  @Column({ nullable: true })
  studentNumber: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  suffix: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  sex: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  priorSchool: string;

  @Column({ nullable: true })
  healthFlags: string;

  @Column({ nullable: true })
  iepNotes: string;

  @Column({ nullable: true })
  govIdType: string;

  @Column({ nullable: true, transformer: EncryptedField.transformer() })
  govIdNumber: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @Column({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
