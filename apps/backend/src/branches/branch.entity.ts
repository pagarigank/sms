import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Department } from '../departments/department.entity';

@Entity({ name: 'branches' })
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, tenant => tenant.branches)
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  tin: string;

  @Column({ nullable: true })
  birBranchCode: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  levelsOffered: string[];

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Department, department => department.branch)
  departments: Department[];
}
