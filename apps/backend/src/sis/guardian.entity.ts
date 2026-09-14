import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'guardians' })
export class Guardian {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  // Auth link: the login user representing this guardian (portal access).
  // NULL until a portal account is provisioned for them.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  suffix: string;

  @Column({ nullable: true })
  contactNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  employer: string;

  @Column({ nullable: true })
  relationshipToStudent: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
