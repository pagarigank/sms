import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../branches/branch.entity';

@Entity({ name: 'departments' })
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  branchId: string;

  @ManyToOne(() => Branch, branch => branch.departments)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ type: 'uuid', array: true, default: () => "'{}'" })
  educationLevelIds: string[];

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  contactEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
