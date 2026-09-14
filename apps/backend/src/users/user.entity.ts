import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/* eslint-disable @typescript-eslint/no-empty-object-type */

@Entity({ name: 'users' })
export class User {
  constructor() { return; }
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ nullable: true })
  middleName!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  passwordHash!: string;

  @Column({ nullable: true })
  mfaSecret!: string;

  @Column({ default: false })
  mfaEnabled!: boolean;

  @Column({ default: 'active' })
  status!: string;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
