import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'user_sessions' })
@Index(['tenantId'])
@Index(['userId', 'loginAt'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column()
  sessionTokenHash: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  loginAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  logoutAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  isForceTerminated: boolean;

  @Column({ nullable: true })
  terminatedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
